# Neth-omation-server
A raspberry pi automation server to remotely control GPIO.
Implemented in Express with Socket.io emitting real time events and syncing across multiple devices 

## Requirements
-  Raspberry Pi (Tested on RPi 3 w/ Raspbian Stretch)

Any of the followings:
- Led
- Lazer
- RGB
- Relay
- Temperature Sensor (ds18b20)
 
## Quick start
1. Clone this repo: `git clone https://github.com/Netherium/neth-omation-server.git`
2. Change directory  `cd neth-omation-server`
3. Install dependencies `npm install`
4. Set accordingly your pin numbers in `gpio.config.json` (<b>GPIO pins</b> and not physical)
5. Comment out init/register functions for any of the modules not used in `gpio.service.ts`
6. Build and run `tsc && sudo node ./dist/gpio-server.js`  

## GPIO packages used
* [onoff](https://github.com/fivdi/onoff)
* [pigpio](https://github.com/fivdi/pigpio)

## Authors
**Netherium**

## Copyright and license
Code released under [the MIT license](https://github.com/Netherium/neth-omation-server/blob/master/LICENSE)