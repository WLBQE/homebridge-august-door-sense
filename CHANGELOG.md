# Change Log
## [2.3.0] - 2023-01-01
### Changes
- Updated config schema.
- Minor quality improvements.

## [2.2.2] - 2022-12-30
### Changes
- Added descrition for the "filter" config.
- Minor housekeeping.

## [2.2.1] - 2022-09-04
### Changes
- Minor code style updates.

## [2.2.0] - 2022-08-28
### Changes
- Use the real serial number instead of lock ID for the SerialNumber accessory information.
- Dev dependencies updates.

## [2.1.0] - 2022-04-09
### Changes
- "No Response" is now shown if the door status can't be fetched.

## [2.0.3] - 2022-04-02
### Changes
- Update Node version requirement.

## [2.0.2] - 2022-04-02
### Changes
- Minor security-related precautions.

## [2.0.1] - 2022-03-31
### Changes
- Miscellaneous stability improvements.

## [2.0.0] - 2022-03-23
### Changes
- Breaking Change: Adjusted UUID generation code for compatibility with [homebridge-august-locks]
  (https://github.com/nnance/homebridge-august-locks). You may need to reconfigure your accessories in the Home app.
- Automatically prune unused accessories from the cache.
