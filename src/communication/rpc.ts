/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBaseLogger } from '../utils/logger';

const Logger = getBaseLogger();

const MESSAGE_TYPE_REQUEST = 1;
const MESSAGE_TYPE_REPLY = 2;

interface RPCRequest {
  id: string;
  type: number;
  fn: string;
  args: any[];
}

interface RPCReply {
  id: string;
  type: number;
  content: any;
}

abstract class RPC {
  private callback_map: object;
  private api_object: any;

  constructor(api_object: any) {
    Logger.trace('[RPC] Constructor');
    this.callback_map = {};
    this.api_object = api_object;
  }

  protected abstract sendRemote(data: object): void;

  private handleRequest(req: RPCRequest): void {
    Logger.debug('[RPC] Handling request: ' + JSON.stringify(req));
    const fn = this.api_object[req.fn];
    if (fn === undefined) {
      Logger.error('[RPC] No "' + req.fn + '" function registred');
      process.exit(1);
    }
    const args = req.args;
    if (args.length > fn.length) {
      Logger.error(
        '[RPC] Too much args for "' +
          req.fn +
          '" - only ' +
          fn.length.toString() +
          ' expected'
      );
      process.exit(1);
    }
    const result = fn.apply(this.api_object, req.args);
    const callId = req.id;
    Logger.trace(
      '[RPC] Sending result with callId ' +
        callId +
        ': ' +
        JSON.stringify(result)
    );
    this.sendRemote({
      id: callId,
      type: MESSAGE_TYPE_REPLY,
      content: result
    });
    return;
  }

  private handleReply(rep: RPCReply): void {
    Logger.trace('[RPC] Handling reply: ' + JSON.stringify(rep));
    const callId = rep.id;
    if (this.callback_map[callId] === undefined) {
      Logger.error('[RPC] Callback for call-' + callId + ' is not set');
      process.exit(1);
    }
    const cb_copy = this.callback_map[callId];
    delete this.callback_map[callId];
    const content = rep.content;
    Logger.trace('[RPC] Running callback');
    cb_copy(content);
  }

  protected handleMessage(data: object): void {
    Logger.trace('[RPC] Handling message: ' + JSON.stringify(data));
    if (typeof data !== 'object') {
      Logger.warn('[RPC] No valid RPC message - skipping');
      return;
    }
    if (data['type'] === MESSAGE_TYPE_REQUEST) {
      this.handleRequest(data as RPCRequest);
      return;
    } else if (data['type'] === MESSAGE_TYPE_REPLY) {
      this.handleReply(data as RPCReply);
      return;
    }
    Logger.warn('[RPC] No valid RPC message - skipping');
    return;
  }

  public call(fn_name: string, args: Array<any>, cb: (data: any) => any): void {
    const randomId = Math.random().toString(36).substr(2, 9);
    Logger.debug('[RPC] Calling ' + fn_name + ' (id: ' + randomId + ')');
    this.sendRemote({
      id: randomId,
      type: MESSAGE_TYPE_REQUEST,
      fn: fn_name,
      args: args
    });
    if (this.callback_map[randomId] !== undefined) {
      throw Error('Callback is already set!');
    }
    Logger.trace('[RPC] Saving callback for ' + randomId);
    this.callback_map[randomId] = cb;
    return;
  }

  /**
   * Promisified version of 'call'.
   */
  public async callAsync(fn_name: string, args: Array<any>): Promise<any> {
    const promise = new Promise((resolve, reject) => {
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
      Logger.debug('[RPC] Got message: ' + JSON.stringify(data));
      this.handleMessage(data);
    });
    return;
  }
}

export default RPC;
