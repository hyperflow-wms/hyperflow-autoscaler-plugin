import Loggers from './logger';
import { HFWflib, HFEngine } from "./types";
import { RedisClient } from 'redis';

class API {
  private rcl: RedisClient;
  private wflib: HFWflib;
  private engine: HFEngine;

  constructor(rcl: RedisClient, wflib: HFWflib, engine: HFEngine) {
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
