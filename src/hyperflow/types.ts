/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-interface */
/**
 * Types for Hyperflow "classes".
 */

export interface HFEventServer {
  emit(...args: any[]): void;
  on(ev: any, listener: any): void;
}

export interface HFWflib {
  // TODO
}

export enum StringBoolean {
  True = 'true',
  False = 'false'
}

export interface HFConfig {
  emulate: StringBoolean;
  workdir: string;
}

export interface WFConfig {
  wfJson: JSON;
  wfId: string;
}

export interface HFEngine {
  config: HFConfig;
  eventServer: HFEventServer;
  logProvenance: boolean;
  // TODO
}

export interface HFProcessConfigExecutor {
  executable: string;
  args: string[];
  cpuRequest?: string;
  memRequest?: string;
}

export interface HFProcessConfig {
  containername: string;
  executor: HFProcessConfigExecutor;
}

export interface HFSignal {
  name: string;
  data?: any;
}

export interface HFProcess {
  name: string;
  function: string;
  ins: number[];
  outs: number[];
  config: HFProcessConfig;
}

export interface HFWorkflow {
  name: string;
  data?: HFSignal[];
  signals?: HFSignal[];
  processes?: HFProcess[];
  tasks?: HFProcess[];
  ins: number[];
  outs: number[];
}
