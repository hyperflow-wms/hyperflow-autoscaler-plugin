const MESSAGE_TYPE_REQUEST = 1;
const MESSAGE_TYPE_REPLY = 2;

interface RPCRequest {
  id: string,
  type: number,
  fn: string,
  args: any[],
}

interface RPCReply {
  id: string,
  type: number,
  content: any,
}

abstract class RPC {

  private callback_map: object;
  private api_object: any;

  constructor(api_object: any) {
    this.callback_map = {};
    this.api_object = api_object;
  }

  protected abstract sendRemote(data: object): void | Error;

  private handleRequest(req: RPCRequest): void {
    let fn = this.api_object[req.fn];
    if (fn === undefined) {
      console.error("FATAL: No '" + req.fn + "' function registred");
      process.exit(1);
    }
    let args = req.args;
    if (args.length > fn.length) {
      console.error("FATAL: Too much args for '" + req.fn + "' - only " + fn.length + " expected");
      process.exit(1);
    }
    let result = fn.apply(this.api_object, req.args);
    let callId = req.id;
    this.sendRemote({
      id: callId,
      type: MESSAGE_TYPE_REPLY,
      content: result,
    });
    return;
  }

  private handleReply(rep: RPCReply): void {
    let callId = rep.id;
    if (this.callback_map[callId] === undefined) {
      console.error(process.pid, "FATAL: Callback for call-" + callId + "' is not set");
      process.exit(1);
    }
    let cb_copy = this.callback_map[callId];
    delete this.callback_map[callId];
    let content = rep.content;
    cb_copy(content);
  }

  protected handleMessage(data: object): void {
    if (typeof data !== 'object') {
      console.log("No valid RPC message - skipping");
      return;
    }
    if (data['type'] === MESSAGE_TYPE_REQUEST) {
      this.handleRequest(data as RPCRequest);
      return;
    } else if (data['type'] === MESSAGE_TYPE_REPLY) {
      this.handleReply(data as RPCReply);
      return;
    }
    console.log("No valid RPC message - skipping");
    return;
  }

  public call(fn_name: string, args: Array<any>, cb: (data: any) => any): void | Error {
    let randomId = Math.random().toString(36).substr(2, 9);
    this.sendRemote({
      id: randomId,
      type: MESSAGE_TYPE_REQUEST,
      fn: fn_name,
      args: args,
    });
    if (this.callback_map[randomId] !== undefined) {
      return Error("Callback is already set!");
    }
    this.callback_map[randomId] = cb;
    return;
  }

  public init(): void {
    process.on('message', (data) => {
      this.handleMessage(data);
    });
    return;
  }
}

export default RPC;
