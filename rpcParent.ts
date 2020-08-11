import RPC from './rpc';
import * as child_process from 'child_process';

class ParentRPC extends RPC {

  private child_process: child_process.ChildProcess;

  constructor(child_process: child_process.ChildProcess, api_object: any) {
    super(api_object);
    this.child_process = child_process;
  }

  protected sendRemote(data: object): void | Error {
    this.child_process.send(data);
    return;
  }

  public init(): void  {
    super.init();
    this.child_process.on('message', (data) => {
      this.handleMessage(data);
    });
    return;
  }
}

export default ParentRPC;
