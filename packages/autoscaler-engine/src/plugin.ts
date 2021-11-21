import { RedisClient } from 'redis';
import { HFEngine, HFWflib, WFConfig } from '@hyperflow/types';
import { getBaseLogger } from '@hyperflow/logger';
import API from './hyperflow/api';

import RPCParent from './communication/rpcParent';
import * as child_process from 'child_process';
const Logger = getBaseLogger();

class AutoscalerPlugin {
  private providerName: string;
  private constructorSuccess = false;
  private wfId!: string;
  private rpc: RPCParent;

  public readonly pgType = 'scheduler';

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
  async init(
    rcl: RedisClient,
    wflib: HFWflib,
    engine: HFEngine,
    config: WFConfig
  ): Promise<void> {
    /* Stop if constructor has failed. */
    if (this.constructorSuccess == false) {
      Logger.error('[main] Constructor has failed, so we reject init() call');
      return;
    }
    this.wfId = config.wfId;

    /* Skip autoscaler if specified 'none'. */
    if (this.providerName == 'none') {
      Logger.debug(
        "[main] Not running autoscaler process, because 'none' provider is specified"
      );
      return;
    }

    /* Create API, engine process and bind it via RPC.
     * Note: when parent dies, child is killed. */
    const api = new API(this.wfId, rcl, wflib, engine);
    Logger.debug('[main] Running process with main-integrated.js');
    const engineProcess = child_process.fork(
      __dirname + '/main-integrated.js',
      [this.providerName],
      { detached: false }
    );
    process.on('exit', function () {
      engineProcess.kill();
    });
    this.rpc = new RPCParent(engineProcess, api);
    this.rpc.init();

    /* Assign RPC to API and listen to all HyperFlow's
     * engine events. */
    api.assignRPC(this.rpc);
    api.listenForEvents();

    return;
  }

  async markWorkflowFinished(wfId: string): Promise<void> {
    Logger.warn(`[AutoscalerPlugin] Marking workflow (${wfId}) as finished`);
    await this.rpc.callAsync('finishWf', [wfId]);
  }
}

export = AutoscalerPlugin;
