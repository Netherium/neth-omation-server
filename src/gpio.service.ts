import * as socketIo from 'socket.io';
import Socket = NodeJS.Socket;
import { GpioEventTypes } from './models/gpioEventType.enum';
import { LedEvent } from './models/ledEvent.model';
import { LaserEvent } from './models/laserEvent.model';
import { RgbEvent } from './models/rgbEvent.model';
import { Gpio } from 'onoff';
import { GpioConfigInterface } from './gpio.config.interface';
import * as ds18b20 from 'ds18b20';
import { Gpio as PIGpio } from 'pigpio';
const PIGpioInternal = require('pigpio');

// pigpio-mock replacement for non raspbian environment
// import { Gpio as PIGpio } from 'pigpio-mock';


export class GpioService {
  private gpioConfig: GpioConfigInterface;
  private temperatureInterval = null;
  private ledStatus = false;
  private ledAdapter: Gpio;
  private relayAdapter: Gpio;

  private laserStatus = true;
  private laserAdapter: Gpio;

  private rgbStatus: RgbEvent = {
    red: 127,
    green: 127,
    blue: 127
  };

  private rgbRedAdapter: PIGpio;
  private rgbGreenAdapter: PIGpio;
  private rgbBlueAdapter: PIGpio;

  constructor(gpioConfig: GpioConfigInterface) {

    this.gpioConfig = gpioConfig;

    this.ledAdapter = new Gpio(gpioConfig.LASER_PIN, 'out');
    this.ledAdapter.writeSync(Number(this.ledStatus));


    this.relayAdapter = new Gpio(gpioConfig.RELAY_PIN, 'out');
    let relayStatus = false;

    setInterval(() => {
      this.relayAdapter.writeSync(Number(relayStatus = !relayStatus));
    }, 5000);

    // Set Gpio Pins to adapters and initialize their status
    // RGB Requires 'Pigpio' whilst momentary switches require 'onoff'
    this.laserAdapter = new Gpio(gpioConfig.LASER_PIN, 'out');
    this.laserAdapter.writeSync(Number(this.laserStatus));

    this.rgbRedAdapter = new PIGpio(gpioConfig.RGB_RED_PIN, {mode: PIGpio.OUTPUT});
    this.rgbRedAdapter.pwmWrite(Number(this.rgbStatus.red));
    this.rgbGreenAdapter = new PIGpio(gpioConfig.RGB_GREEN_PIN, {mode: PIGpio.OUTPUT});
    this.rgbGreenAdapter.pwmWrite(Number(this.rgbStatus.green));
    this.rgbBlueAdapter = new PIGpio(gpioConfig.RGB_BLUE_PIN, {mode: PIGpio.OUTPUT});
    this.rgbBlueAdapter.pwmWrite(Number(this.rgbStatus.blue));
  }

  public initializeConnectEmissions(io) {
    io.emit(GpioEventTypes.LED, {'status': this.ledStatus});
    io.emit(GpioEventTypes.LASER, {'status': this.laserStatus});
    io.emit(GpioEventTypes.RGB, this.rgbStatus);
    console.log('Initializing');
    console.log('============');
    console.log('Led:   ', this.ledStatus);
    console.log('Laser: ', this.laserStatus);
    console.log('RGB:   ', this.rgbStatus.red, ' ', this.rgbStatus.green, ' ', this.rgbStatus.blue);
  }

  public registerLedEvent(socket: Socket, io: socketIo.Server): void {
    socket.on(GpioEventTypes.LED, (d: LedEvent) => {
      console.log('On', GpioEventTypes.LED);
      this.ledStatus = d.status;
      if (this.ledStatus !== this.ledAdapter.readSync()) {
        this.ledAdapter.writeSync(Number(this.ledStatus));
        io.emit(GpioEventTypes.LED, d);
      }
    });
  }

  public registerLaserEvent(socket: Socket, io: socketIo.Server): void {
    socket.on(GpioEventTypes.LASER, (d: LaserEvent) => {
      console.log('On', GpioEventTypes.LASER);
      this.laserStatus = d.status;
      if (this.laserStatus !== this.laserAdapter.readSync()) {
        this.laserAdapter.writeSync(Number(this.laserStatus));
        io.emit(GpioEventTypes.LASER, d);
      }
    });
  }

  public registerRGBEvent(socket: Socket, io: socketIo.Server): void {
    socket.on(GpioEventTypes.RGB, (d: RgbEvent) => {
      console.log('On', GpioEventTypes.RGB);
      if (this.rgbStatus.red !== d.red || this.rgbStatus.red !== this.rgbRedAdapter.getPwmDutyCycle()
          || this.rgbStatus.green !== d.green || this.rgbStatus.green !== this.rgbGreenAdapter.getPwmDutyCycle()
          || this.rgbStatus.blue !== d.blue || this.rgbStatus.blue !== this.rgbBlueAdapter.getPwmDutyCycle()) {
        this.rgbStatus = d;
        this.rgbRedAdapter.pwmWrite(Number(this.rgbStatus.red));
        this.rgbGreenAdapter.pwmWrite(Number(this.rgbStatus.green));
        this.rgbBlueAdapter.pwmWrite(Number(this.rgbStatus.blue));

        io.emit(GpioEventTypes.RGB, d);
      }
    });
  }

  /**
   * Register temperature event
   * Emits temperature every 60 seconds using ds18b20 sensor
   * @param io
   */
  public registerTemperatureEvent(io: any): void {
    let parent = this;
    ds18b20.sensors(function (err, devices) {
      let deviceId = null;

      for (let i = 0; i < devices.length; i++) {
        if (devices[i].startsWith('28-')) {
          deviceId = devices[i];
          parent.temperatureInterval = setInterval(() => {
            console.log('TEMPERATURE', ds18b20.temperatureSync(deviceId));
            io.emit(GpioEventTypes.TEMPERATURE, {'status': ds18b20.temperatureSync(deviceId)});
          }, 5000);
        }
      }
    });
  }

  public terminateAdapters() {
    // Turn Led, Laser, Relay off and free resources
    this.ledAdapter.unexport();
    this.laserAdapter.unexport();
    this.relayAdapter.unexport();
    clearInterval(this.temperatureInterval);
    // Turn RGB off and free resources
    this.rgbRedAdapter.digitalWrite(0);
    this.rgbGreenAdapter.digitalWrite(0);
    this.rgbBlueAdapter.digitalWrite(0);
    PIGpioInternal.terminate();
  }
}
