import API from './api';
import Loggers from './logger';
import { HFWflib, HFEngine } from "./types";
import RPCParent from "./rpcParent";

import { RedisClient } from 'redis';
import * as child_process from 'child_process';

class AutoscalerPlugin
{
  private providerName: string;
  private constructorSuccess: boolean = false;

  constructor() {
    /* Get provider name from env variable. */
    let providerName = process.env['HF_VAR_autoscalerProvider'];
    if (providerName == undefined) {
      Loggers.base.error("[main] No valid provider specified. Hint: use env var HF_VAR_autoscalerProvider");
      return;
    }
    this.providerName = providerName;

    /* Mark constructor execution as success. */
    this.constructorSuccess = true;
  }

  /**
   * Entry point for launching autoscaler.
   */
  init(rcl: RedisClient, wflib: HFWflib, engine: HFEngine) {
    /* Stop if constructor has failed. */
    if (this.constructorSuccess == false) {
      Loggers.base.error("[main] Constructor has failed, so we reject init() call");
      return;
    }

    /* Skip autoscaler if specified 'none'. */
    if (this.providerName == "none") {
      Loggers.base.debug("[main] Not running autoscaler process, because 'none' provider is specified");
      return;
    }

    /* Create API, engine process and bind it via RPC.
    * Note: when parent dies, child is killed. */
    let api = new API(rcl, wflib, engine);
    Loggers.base.debug("[main] Running process with engine.js");
    let engineProcess = child_process.fork(__dirname + '/engine.js', [this.providerName], { detached: false });
    process.on('exit', function () {
      engineProcess.kill();
    });
    let rpc = new RPCParent(engineProcess, api);
    rpc.init();

    /* Assign RPC to API and listen to all HyperFlow's
    * engine events. */
    api.assignRPC(rpc);
    api.listenForEvents();

    return;
  }
}


export = AutoscalerPlugin;