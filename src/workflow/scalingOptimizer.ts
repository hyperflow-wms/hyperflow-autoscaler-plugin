import { MachineSpec } from "../machines";
import { Demand } from "./plan";

class ScalingOptimizer
{
  private runningMachines: number;
  private machineType: MachineSpec;
  private provisioningTimeMs: number;
  private analyzedTimeMs: number;

  constructor(runningMachines: number, machineType: MachineSpec, provisioningTimeMs: number, analyzedTimeMs: number) {
    this.runningMachines = runningMachines;
    this.machineType = machineType;
    this.provisioningTimeMs = provisioningTimeMs;
    this.analyzedTimeMs = analyzedTimeMs;
  }

  findBestDecision(demandFrames: Map<number, Demand>): void {
    // TODO
    return;
  }

}

export default ScalingOptimizer;
