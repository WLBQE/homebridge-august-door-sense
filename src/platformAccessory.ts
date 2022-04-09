import { Service, PlatformAccessory, CharacteristicValue, HAPStatus } from 'homebridge';
import { augustGetDoorStatus, AugustLock, AugustDoorStatus} from './august';

import { AugustSmartLockPlatform } from './platform';

export class AugustSmartLockAccessory {
  private service: Service;
  private currentStatus: AugustDoorStatus;

  constructor(
    private readonly platform: AugustSmartLockPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const lock: AugustLock = accessory.context.device;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'August')
      .setCharacteristic(this.platform.Characteristic.Model, 'DoorSense')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, lock.id);

    this.service = this.addContactSensorService();
    this.service.setCharacteristic(this.platform.Characteristic.Name, lock.name);

    this.currentStatus = AugustDoorStatus.UNKNOWN;

    setInterval(this.updateStatus.bind(this), (this.platform.config['refreshInterval'] || 10) * 1000);
  }

  addContactSensorService(): Service {
    const service = this.accessory.getService(this.platform.Service.ContactSensor)
      || this.accessory.addService(this.platform.Service.ContactSensor);

    service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getOn.bind(this));

    return service;
  }

  async getOn(): Promise<CharacteristicValue> {
    // run status update in the background to avoid blocking the main thread
    setImmediate(this.updateStatus.bind(this));
    switch(this.currentStatus) {
      case AugustDoorStatus.CLOSED:
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
      case AugustDoorStatus.OPEN:
        return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
      default:
        throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async updateStatus() {
    const id = this.accessory.context.device['id'];

    augustGetDoorStatus(this.platform.Session!, id, this.platform.log).then((status) => {
      this.platform.log.debug('Get Door Status ->', status);
      this.currentStatus = status;

      switch(status) {
        case AugustDoorStatus.CLOSED:
          this.service.updateCharacteristic(
            this.platform.Characteristic.ContactSensorState, this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
          break;
        case AugustDoorStatus.OPEN:
          this.service.updateCharacteristic(
            this.platform.Characteristic.ContactSensorState, this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
          break;
        default:
          // no-op
      }
    }).catch((error) => {
      this.platform.log.error('GetDoorStatus threw an error:\n', error);
    });
  }
}
