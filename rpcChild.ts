import RPC from './rpc';

import Loggers from './logger';
class ChildRPC extends RPC {

  private parent_process: NodeJS.Process;

  constructor(api_object: any) {
    super(api_object);
    Loggers.base.silly('[ChildRPC] Constructor');
    this.parent_process = process;
  }

  protected sendRemote(data: object): void | Error {
    Loggers.base.debug('[ChildRPC] Sending remote:' + JSON.stringify(data));
    if (process.send === undefined) {
      return Error("ChildRPC cannot be used on root process");
    }
    process.send(data);
    return;
  }
}

export default ChildRPC;
