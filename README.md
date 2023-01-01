<p align="center">
<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge August DoorSense Plugin

This is a homebridge plugin that solely supports August DoorSense door sensors. It can be used in combination with native HomeKit locks or
other August Homebridge plugins.

This plugin is originally based on [homebridge-august-locks](https://github.com/nnance/homebridge-august-locks).

## Installation

This plugin can be installed from the [Homebridge UI](https://github.com/oznu/homebridge-config-ui-x) by searching for "August DoorSense".

Alternatively, it can be installed with the following command:

```sh
npm install -g homebridge-august-door-sense
```

## Configuration

It is highly recommended to configure the plugin with the [Homebridge UI](https://github.com/oznu/homebridge-config-ui-x).

### Required Fields

- **August ID**: The login ID of your August account. Can be either email or phone.

- **ID Type**: Type of the August ID.

- **Password**: The password of your August account.

- **Installation ID**: A random string used to identify this homebridge instance as an authorized application to your August account. It needs
to be random and unique and you should never change it or you will have to reauthenticate with the 2FA Code. This is used to prevent
unauthorized access to your August account.  You can generate a random string [here](https://www.guidgenerator.com).

- **2FA Code**: The 6-digit 2-factor authentication code from August when the plugin authenticates with the August API. Upon the initial
setup, you should configure all other required fields, restart homebridge, wait for an email from August, enter the 6-digit code into this
configuration and then restart homebridge one last time. This won't be required for subsequent restarts. However, in the rare case when this
plugin is dormant for an extended period, you may have to reauthenticate with a new 2-factor authentication code.

### Optional Fields

- **Lock Filter**: Comma separated list of IDs of locks you want this plugin to ignore. If any device on your August account doesn't have
DoorSense installed, please include its ID here. The lock ID can be found in Homebridge logs.

- **Refresh Interval**: Duration in seconds that the plugin will poll the API for status updates.

- **API Key**: This plugin uses an API key pulled from the August Android app. If you wish to use your own API key, you can put it here.