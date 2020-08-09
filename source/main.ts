import API from './api';
import RPCParent from "./rpcParent";
import { RedisClient } from 'redis';
import * as child_process from 'child_process';

function runAutoscaler(rcl: RedisClient, wflib: object, plugins: any[]) {
  /* Create API, engine process and bind it via RPC. */
  let api = new API(rcl, wflib, plugins);
  let engineProcess = child_process.fork(__dirname + '/engine.js');
  let rpc = new RPCParent(engineProcess, api);
  rpc.init();
  return;
}

export = {
  run: runAutoscaler,
};
