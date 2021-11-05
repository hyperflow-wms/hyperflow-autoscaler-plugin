import API from './hyperflow/api';
import { getBaseLogger } from './utils/logger';
import { HFWflib, HFEngine } from './hyperflow/types';
import RPCParent from './communication/rpcParent';

import { RedisClient } from 'redis';
import * as child_process from 'child_process';

const Logger = getBaseLogger();

class AutoscalerPlugin {
  private providerName: string;
  private constructorSuccess = false;

  constructor() {
    /* Get provider name from env variable. */
    const providerName = process.env['HF_VAR_autoscalerProvider'];
    if (providerName == undefined) {
      Logger.error(
        '[main] No valid provider specified. Hint: use env var HF_VAR_autoscalerProvider'
      );
      return;
    }
    this.providerName = providerName;

    /* Mark constructor execution as success. */
    this.constructorSuccess = true;
  }

  /**
   * Entry point for launching autoscaler.
   */
  init(rcl: RedisClient, wflib: HFWflib, engine: HFEngine): void {
    /* Stop if constructor has failed. */
    if (this.constructorSuccess == false) {
      Logger.error('[main] Constructor has failed, so we reject init() call');
      return;
    }

    /* Skip autoscaler if specified 'none'. */
    if (this.providerName == 'none') {
      Logger.debug(
        "[main] Not running autoscaler process, because 'none' provider is specified"
      );
      return;
    }

    /* Create API, engine process and bind it via RPC.
     * Note: when parent dies, child is killed. */
    const api = new API(rcl, wflib, engine);
    Logger.debug('[main] Running process with engine.js');
    const engineProcess = child_process.fork(
      __dirname + '/engine.js',
      [this.providerName],
      { detached: false }
    );
    process.on('exit', function () {
      engineProcess.kill();
    });
    const rpc = new RPCParent(engineProcess, api);
    rpc.init();

    /* Assign RPC to API and listen to all HyperFlow's
     * engine events. */
    api.assignRPC(rpc);
    api.listenForEvents();

    return;
  }
}

export = AutoscalerPlugin;
