/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/ban-types */
import RPC from './rpc';

import { getBaseLogger } from '@hyperflow/logger';

import * as child_process from 'child_process';

const Logger = getBaseLogger();

class ParentRPC extends RPC {
  private child_process: child_process.ChildProcess;

  constructor(child_process: child_process.ChildProcess, api_object: any) {
    super(api_object);
    Logger.trace('[ParentRPC] Constructor');
    this.child_process = child_process;
  }

  protected sendRemote(data: object): void {
    Logger.debug('[ParentRPC] Sending remote: ' + JSON.stringify(data));
    this.child_process.send(data);
    return;
  }

  public init(): void {
    super.init();
    this.child_process.on('message', (data) => {
      Logger.debug('[ParentRPC] Got message: ' + JSON.stringify(data));
      if (typeof data != 'object') {
        Logger.error('[ParentRPC] Expected object as message!');
        throw Error('Unexpected message format');
      }
      this.handleMessage(data);
    });
    return;
  }
}

export default ParentRPC;
