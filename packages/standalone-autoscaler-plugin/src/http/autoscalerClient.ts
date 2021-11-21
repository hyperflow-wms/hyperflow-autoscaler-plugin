/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from 'node-fetch';
import { getBaseLogger } from '@hyperflow/logger';

const Logger = getBaseLogger();

type HealthCheckResponse = {
  status: string;
};

export default class AutoscalerClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public async checkConnection(): Promise<boolean> {
    const healthStatusRequest = await fetch(`${this.url}/health`);
    if (healthStatusRequest.status === 200) {
      const responseStatus =
        (await healthStatusRequest.json()) as HealthCheckResponse;
      if (responseStatus.status === 'healthy') return true;
      else return false;
    } else {
      return false;
    }
  }

  public async sendWorkflowDetails(wfId: string, wfJson: any): Promise<void> {
    Logger.debug(
      `[HTTP] Sending workflow (${wfId}) details to standalone autoscaler: ${JSON.stringify(
        wfJson
      )}`
    );
    const payload = {
      workflow: wfJson
    };
    await fetch(`${this.url}/workflow?wfId=${wfId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  public async markWorkflowFinished(wfId: string): Promise<void> {
    Logger.debug(`[HTTP] Marking workflow (${wfId}) as finished`);
    await fetch(`${this.url}/workflow/finish?wfId=${wfId}`, { method: 'POST' });
  }

  public async sendEvent(
    wfId: string,
    fnName: string,
    args: Array<any>
  ): Promise<void> {
    Logger.debug(`[HTTP] Calling ${fnName}`);
    const payload = {
      args: args
    };
    await fetch(`${this.url}/call/${fnName}?wfId=${wfId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }
}
