import Loggers from './logger';
import { RedisClient } from 'redis';

class API {
  private rcl: RedisClient;
  private wflib: object;
  private plugins: any[];

  constructor(rcl: RedisClient, wflib: object, plugins: any[]) {
    Loggers.base.silly('[API] Constructor called');
    this.rcl = rcl;
    this.wflib = wflib;
    this.plugins = plugins;
  }

  /**
   * Test function.
   * TODO: remove
   */
  public addNumbers(a: number, b: number): number {
    Loggers.base.debug('[API] Adding ' + a.toString() + ' to ' + b.toString());
    return a + b;
  }
}

export default API;
