/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Application } from 'express';
import express = require('express');
import Engine from '../engine';
import { getBaseLogger } from '../utils/logger';

const Logger = getBaseLogger();

class HttpApi {
  private app: Application;
  private api_object: any;
  private engine: Engine;
  private host: string;
  private port: number;

  constructor(api_object: any, engine: Engine) {
    this.app = express();
    this.api_object = api_object;
    this.engine = engine;
    let host = process.env['HF_VAR_host'];
    if (host === undefined) {
      Logger.warn('No HF_VAR_host set, setting host to default (0.0.0.0)');
      host = '0.0.0.0';
    }
    this.host = host;
    const portStr = process.env['HF_VAR_port'];
    let port: number;
    if (portStr === undefined) {
      Logger.warn('No HF_VAR_port set, setting port to default (8080)');
      port = 8080;
    } else {
      port = +portStr;
    }
    this.port = port;
  }

  public init(): void {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    this.app.get('/health', (_req: express.Request, res: express.Response) => {
      return res.status(200).send({
        status: 'healthy'
      });
    });

    this.app.post(
      '/workflow',
      async (
        req: express.Request,
        res: express.Response
      ): Promise<express.Response> => {
        const rawWfId = req.query.wfId;
        if (rawWfId) {
          const wfId = rawWfId as string;
          const wfJson = req.body.workflow;
          this.engine.startWfInstance(wfId, wfJson, new Date().getTime());
          return res.sendStatus(200);
        } else {
          Logger.warn(`No wfId in incoming request`);
          return res.status(404).send('No wfId');
        }
      }
    );

    this.app.post(
      '/workflow/finish',
      async (
        req: express.Request,
        res: express.Response
      ): Promise<express.Response> => {
        const rawWfId = req.query.wfId;
        if (rawWfId) {
          const wfId = rawWfId as string;
          this.engine.finishWf(wfId);
          return res.sendStatus(200);
        } else {
          Logger.warn(`No wfId in incoming request`);
          return res.status(404).send('No wfId');
        }
      }
    );

    this.app.post(
      '/call/:fnName',
      async (
        req: express.Request,
        res: express.Response
      ): Promise<express.Response> => {
        const wfId = req.query.wfId;
        if (wfId) {
          const result = await this.handleRequest(req)
            .then(() => res.sendStatus(200))
            .catch(() => res.sendStatus(500));
          return result;
        } else {
          Logger.warn(`No wfId in incoming request`);
          return res.status(404).send('No wfId');
        }
      }
    );
  }

  public listen(): void {
    this.app.listen(this.port, this.host, (): void => {
      Logger.info(`Scaler is listening on host ${this.host} port ${this.port}`);
    });
  }

  private async handleRequest(req: express.Request): Promise<void> {
    Logger.debug(`[HTTP] Handling request: ${JSON.stringify(req)}`);
    const fnName = req.params['fnName'];
    const wfId = req.params['wfId'];
    const fn = this.api_object[fnName];
    if (fn === undefined) {
      Logger.error(`[HTTP] No ${fnName} function registered`);
      process.exit(1);
    }
    if (wfId === undefined) {
      Logger.warn(`[HTTP] No wfId in incoming request, skipping...`);
    } else {
      const payload = req.body;
      const args = payload.args;
      if (args.length + 1 > fn.length) {
        Logger.error(
          '[HTTP] Too much args for "' +
            fnName +
            '" - only ' +
            fn.length.toString() +
            ' expected'
        );
        process.exit(1);
      }
      const result = fn.apply(this.api_object, [wfId].concat(args));
      Logger.trace(`[HTTP] Sending result: ${JSON.stringify(result)}`);
    }
  }
}

export default HttpApi;
