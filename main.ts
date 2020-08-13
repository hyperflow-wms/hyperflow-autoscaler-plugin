import API from './api';
import Loggers from './logger';
import RPCParent from "./rpcParent";

import { RedisClient } from 'redis';
import * as child_process from 'child_process';

function runAutoscaler(rcl: RedisClient, wflib: object, plugins: any[]) {
  /* Create API, engine process and bind it via RPC. */
  let api = new API(rcl, wflib, plugins);
  Loggers.base.debug("[main] Running process with engine.js");
  let engineProcess = child_process.fork(__dirname + '/engine.js', [], { detached: false });
  let rpc = new RPCParent(engineProcess, api);
  rpc.init();
  return;
}

export default {
  run: runAutoscaler,
};
