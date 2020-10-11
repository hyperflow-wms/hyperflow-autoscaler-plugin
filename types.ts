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

export interface HFEngine {
  eventServer: HFEventServer;
  logProvenance: boolean;
  // TODO
}
