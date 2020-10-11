import Loggers from './logger';
import { RedisClient } from 'redis';

class API {
  private rcl: RedisClient;
  private wflib: object;
  private engine: object;

  constructor(rcl: RedisClient, wflib: object, engine: object) {
    Loggers.base.silly('[API] Constructor called');
    this.rcl = rcl;
    this.wflib = wflib;
    this.engine = engine;
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
