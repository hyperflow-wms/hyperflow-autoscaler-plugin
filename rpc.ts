import Loggers from './logger';

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
    Loggers.base.silly('[RPC] Constructor');
    this.callback_map = {};
    this.api_object = api_object;
  }

  protected abstract sendRemote(data: object): void | Error;

  private handleRequest(req: RPCRequest): void {
    Loggers.base.debug('[RPC] Handling request: ' + JSON.stringify(req));
    let fn = this.api_object[req.fn];
    if (fn === undefined) {
      Loggers.base.error('[RPC] No "' + req.fn + '" function registred');
      process.exit(1);
    }
    let args = req.args;
    if (args.length > fn.length) {
      Loggers.base.error('[RPC] Too much args for "' + req.fn + '" - only ' + fn.length.toString() + " expected");
      process.exit(1);
    }
    let result = fn.apply(this.api_object, req.args);
    let callId = req.id;
    Loggers.base.silly('[RPC] Sending result with callId ' + callId + ': ' + JSON.stringify(result));
    this.sendRemote({
      id: callId,
      type: MESSAGE_TYPE_REPLY,
      content: result,
    });
    return;
  }

  private handleReply(rep: RPCReply): void {
    Loggers.base.silly('[RPC] Handling reply: ' + JSON.stringify(rep));
    let callId = rep.id;
    if (this.callback_map[callId] === undefined) {
      Loggers.base.error('[RPC] Callback for call-' + callId + ' is not set');
      process.exit(1);
    }
    let cb_copy = this.callback_map[callId];
    delete this.callback_map[callId];
    let content = rep.content;
    Loggers.base.silly('[RPC] Running callback');
    cb_copy(content);
  }

  protected handleMessage(data: object): void {
    Loggers.base.silly('[RPC] Handling message: ' + JSON.stringify(data));
    if (typeof data !== 'object') {
      Loggers.base.warn('[RPC] No valid RPC message - skipping');
      return;
    }
    if (data['type'] === MESSAGE_TYPE_REQUEST) {
      this.handleRequest(data as RPCRequest);
      return;
    } else if (data['type'] === MESSAGE_TYPE_REPLY) {
      this.handleReply(data as RPCReply);
      return;
    }
    Loggers.base.warn('[RPC] No valid RPC message - skipping');
    return;
  }

  public call(fn_name: string, args: Array<any>, cb: (data: any) => any): void | Error {
    let randomId = Math.random().toString(36).substr(2, 9);
    Loggers.base.debug('[RPC] Calling ' + fn_name + ' (id: ' + randomId + ')');
    this.sendRemote({
      id: randomId,
      type: MESSAGE_TYPE_REQUEST,
      fn: fn_name,
      args: args,
    });
    if (this.callback_map[randomId] !== undefined) {
      return Error("Callback is already set!");
    }
    Loggers.base.silly('[RPC] Saving callback for ' + randomId);
    this.callback_map[randomId] = cb;
    return;
  }

  /**
   * Promisified version of 'call'.
   */
  public async callAsync(fn_name: string, args: Array<any>): Promise<any | Error> {
    let promise = new Promise((resolve, reject) => {
      try {
        this.call(fn_name, args, (data) => {
          resolve(data);
        });
      } catch (err) {
        reject(err);
      }
    });

    return promise;
  }

  public init(): void {
    process.on('message', (data) => {
      Loggers.base.debug('[RPC] Got message: ' + JSON.stringify(data));
      this.handleMessage(data);
    });
    return;
  }
}

export default RPC;
