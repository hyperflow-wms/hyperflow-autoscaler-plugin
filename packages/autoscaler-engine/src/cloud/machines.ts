export interface MachineSpec {
  cpu: string;
  memory: string;
}

export interface MachinesSpecsMap {
  [specName: string]: MachineSpec;
}
