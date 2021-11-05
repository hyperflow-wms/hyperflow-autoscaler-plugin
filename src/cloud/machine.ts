import ResourceRequirements from '../kubernetes/resourceRequirements';

interface IMachineType {
  name: string;
  cpu: string;
  memory: string;
}

class MachineType {
  public readonly name: string;
  private cpuMillis: number;
  private memBytes: number;

  public constructor({ name, cpu, memory }: IMachineType) {
    this.name = name;
    this.cpuMillis = ResourceRequirements.Utils.parseCpuString(cpu);
    this.memBytes = ResourceRequirements.Utils.parseMemString(memory);
  }

  /**
   * Getter for name.
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Getter for cpuMillis.
   */
  public getCpuMillis(): number {
    return this.cpuMillis;
  }

  /**
   * Getter for memBytes.
   */
  public getMemBytes(): number {
    return this.memBytes;
  }
}

export default MachineType;
