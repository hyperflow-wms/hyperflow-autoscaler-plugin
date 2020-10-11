import Loggers from './logger';
import { HFWflib, HFEngine } from "./types";
import { RedisClient } from 'redis';
import RPC from './rpc';

class API {
  private rcl: RedisClient;
  private wflib: HFWflib;
  private engine: HFEngine;
  private rpc?: RPC;

  constructor(rcl: RedisClient, wflib: HFWflib, engine: HFEngine) {
    Loggers.base.silly('[API] Constructor called');
    this.rcl = rcl;
    this.wflib = wflib;
    this.engine = engine;
  }

  /**
   * Example API function.
   * TODO: remove in future.
   */
  public addNumbers(a: number, b: number): number {
    Loggers.base.debug('[API] Adding ' + a.toString() + ' to ' + b.toString());
    return a + b;
  }

  /**
   * We want to store RPC instance, because we would
   * like to make some calls to autoscaler API.
   * @param rpc
   */
  public assignRPC(rpc: RPC): void | Error {
    if (this.rpc !== undefined) {
      throw Error("RPC is already assigned");
    }
    this.rpc = rpc;

    return;
  }
}

export default API;
