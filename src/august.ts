import { Logger } from 'homebridge';
import { request, RequestOptions } from 'https';
import { TextEncoder } from 'util';

export type AugustHome = {
  id: string;
  name: string;
};

export type AugustLock = {
  id: string;
  name: string;
  macAddress: string;
  houseId: string;
  houseName: string;
};

export enum AugustDoorStatus {
  UNKNOWN = 0,
  CLOSED = 1,
  OPEN = 2,
}

export type AugustSession = {
  apiKey: string;
  idType: string;
  identifier: string;
  token: string;
};

export type AugustSessionOptions = {
  apiKey: string;
  uuid: string;
  idType: string;
  identifier: string;
  password: string;
  code: string;  // 2FA code
};

type AugustResponse = {
  token: string;
  status?: number;
  payload: object;
};

type AugustStatus = {
  doorStatus: AugustDoorStatus;
  serialNumber?: string;
};

export async function augustStartSession(options: AugustSessionOptions, log: Logger): Promise<AugustSession> {
  const { code } = options;
  const session = await augustLogin(options, log);
  log.debug(JSON.stringify(session));

  const { status } = await augustGetMe(session, log);

  // Session isn't valid yet, so we need to validate it by sending a code
  if (status !== 200) {
    if (!code) {
      await augustSendCode(session, log);
      log.info('Session is not valid yet, but no 2FA code was provided. Please provide a 2FA code.');
    } else {
      const resp = await augustValidateCode(code, session, log);
      if (resp.status !== 200) {
        await augustSendCode(session, log);
        log.error(`Invalid code: ${resp.status}, new code sent, please provide the new 2FA code.`);
      } else {
        session.token = resp.token;
      }
    }
  }

  return session;
}

function getRequestOptions(apiKey: string, path: string, method: string, session?: AugustSession): RequestOptions {
  const options = {
    hostname: 'api-production.august.com',
    port: 443,
    path: path,
    method: method,
    headers: {
      'x-august-api-key': apiKey,
      'x-kease-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept-Version': '0.0.1',
      'User-Agent': 'August/Luna-3.2.2',
    },
  };
  if (session) {
    options['headers']['x-august-access-token'] = session.token;
  }
  return options;
}

async function makeRequest(options: RequestOptions, data: Uint8Array, log: Logger): Promise<AugustResponse> {
  return new Promise((resolve) => {
    const req = request(options, res => {
      const chunks: Array<string> = [];

      res.on('data', d => {
        log.debug(`statusCode: ${res.statusCode}`);

        const buff = d as Buffer;
        const buffStr = buff.toString('utf8');
        log.debug(buffStr);

        chunks.push(buffStr);
      });

      res.on('end', () => {
        const msg = chunks.join();
        let payload;
        if (res.statusCode === 200) {
          try {
            payload = JSON.parse(msg);
          } catch (error) {
            log.error(`Error parsing JSON: ${msg}`);
          }
        } else {
          log.debug(`Received non-200 HTTP response ${res.statusCode}:\n${msg}`);
        }

        resolve({
          status: res.statusCode,
          token: res.headers['x-august-access-token'] as string,
          payload: payload,
        });
      });
    });

    req.on('error', error => {
      log.error(`Error reaching August server: ${error}`);
    });

    req.write(data);
    req.end();
  });
}

async function augustLogin(sessionOptions: AugustSessionOptions, log: Logger): Promise<AugustSession> {
  const { apiKey, uuid, idType, password, identifier } = sessionOptions;

  const data = new TextEncoder().encode(
    JSON.stringify({
      identifier: `${idType}:${identifier}`,
      password: password,
      installId: uuid,
    }),
  );

  const requestOptions = getRequestOptions(apiKey, '/session', 'POST');
  const res = await makeRequest(requestOptions, data, log);
  if (res.status !== 200 || !res.payload['userId']) {
    throw new Error(`Invalid user credentials: ${res.status}`);
  } else {
    return {
      apiKey: apiKey,
      idType: idType,
      identifier: identifier,
      token: res.token,
    };
  }
}

async function augustGetMe(session: AugustSession, log: Logger): Promise<AugustResponse> {
  const options = getRequestOptions(session.apiKey, '/users/me', 'GET', session);
  return makeRequest(options, new Uint8Array(), log);
}

async function augustSendCode(session: AugustSession, log: Logger): Promise<AugustResponse> {
  const data = new TextEncoder().encode(
    JSON.stringify({
      value: session.identifier,
    }),
  );

  const options = getRequestOptions(session.apiKey, `/validation/${session.idType}`, 'POST', session);
  return makeRequest(options, data, log);
}

async function augustValidateCode(code: string, session: AugustSession, log: Logger): Promise<AugustResponse> {
  const payload = {
    code,
  };
  payload[session.idType] = session.identifier;

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const options = getRequestOptions(session.apiKey, `/validate/${session.idType}`, 'POST', session);
  return makeRequest(options, data, log);
}

export async function augustGetHouses(session: AugustSession, log: Logger): Promise<AugustHome[]> {
  const options = getRequestOptions(session.apiKey, '/users/houses/mine', 'GET', session);
  const results = await makeRequest(options, new Uint8Array(), log);

  if (results.status === 200 && Array.isArray(results.payload)) {
    const homes: AugustHome[] = (results.payload).map(home => ({
      id: home['HouseID'],
      name: home['HouseName'],
    }));
    return homes;
  } else {
    return [];
  }
}

export async function augustGetLocks(session: AugustSession, log: Logger): Promise<AugustLock[]> {
  const options = getRequestOptions(session.apiKey, '/users/locks/mine', 'GET', session);

  const results = await makeRequest(options, new Uint8Array(), log);

  if (results.status === 200 && results.payload) {
    const locks: AugustLock[] = Object.keys(results.payload).map(id => {
      const lock: object = results.payload![id];
      return {
        id: id,
        name: lock['LockName'],
        macAddress: lock['macAddress'],
        houseId: lock['HouseID'],
        houseName: lock['HouseName'],
      };
    });
    return locks;
  } else {
    return [];
  }
}

export async function augustGetDoorStatus(session: AugustSession, lockId: string, log: Logger): Promise<AugustStatus> {
  const options = getRequestOptions(session.apiKey, `/remoteoperate/${lockId}/status`, 'PUT', session);
  const results = await makeRequest(options, new Uint8Array(), log);

  if (results.status === 200 && results.payload) {
    const status = results.payload['doorState'];
    const serialNumber = results.payload['info']?.['serialNumber'];
    if (status === 'kAugDoorState_Closed') {
      return { doorStatus: AugustDoorStatus.CLOSED, serialNumber: serialNumber };
    } else if (status === 'kAugDoorState_Open') {
      return { doorStatus: AugustDoorStatus.OPEN, serialNumber: serialNumber };
    } else if (status === 'kAugDoorState_Init') {
      return { doorStatus: AugustDoorStatus.UNKNOWN, serialNumber: serialNumber };
    } else if (!status) {
      log.info(`Door status for lock ${lockId} unknown. Exclude this device in the config if DoorSense isn't enabled.`);
      return { doorStatus: AugustDoorStatus.UNKNOWN, serialNumber: serialNumber };
    } else {
      throw new Error(`Unknown door status: ${status}`);
    }
  } else {
    return { doorStatus: AugustDoorStatus.UNKNOWN };
  }
}

export async function augustGetSerialNumber(session: AugustSession, lockId: string, log: Logger): Promise<string> {
  const options = getRequestOptions(session.apiKey, `/remoteoperate/${lockId}/status`, 'PUT', session);
  const results = await makeRequest(options, new Uint8Array(), log);

  if (results.status === 200 && results.payload) {
    return results.payload['serialNumber'];
  } else {
    return '';
  }
}
