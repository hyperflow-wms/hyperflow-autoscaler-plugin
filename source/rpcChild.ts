import RPC from './rpc';

class ChildRPC extends RPC {

  private parent_process: NodeJS.Process;

  constructor(api_object: any) {
    super(api_object);
    this.parent_process = process;
  }

  protected sendRemote(data: object): void | Error {
    if (process.send === undefined) {
      return Error("ChildRPC cannot be used on root process");
    }
    process.send(data);
    return;
  }
}

export default ChildRPC;
