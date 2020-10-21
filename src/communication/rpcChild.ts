import RPC from './rpc';

import { getBaseLogger } from '../utils/logger';

const Logger = getBaseLogger();

class ChildRPC extends RPC {

  private parent_process: NodeJS.Process;

  constructor(api_object: any) {
    super(api_object);
    Logger.silly('[ChildRPC] Constructor');
    this.parent_process = process;
  }

  protected sendRemote(data: object): void | Error {
    Logger.debug('[ChildRPC] Sending remote:' + JSON.stringify(data));
    if (process.send === undefined) {
      return Error("ChildRPC cannot be used on root process");
    }
    process.send(data);
    return;
  }
}

export default ChildRPC;
