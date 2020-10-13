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
  True = "true",
  False = "false",
}

export interface HFConfig {
  emulate: StringBoolean;
  workdir: string;
}

export interface HFEngine {
  config: HFConfig;
  eventServer: HFEventServer;
  logProvenance: boolean;
  // TODO
}

export interface HFSignal {
  name: string;
}

export interface HFProcess {
  name: string;
  ins: number[];
  outs: number[];
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
