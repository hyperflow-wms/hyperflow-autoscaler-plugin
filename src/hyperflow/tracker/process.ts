import { HFProcess } from "../types";

type timestamp = number;

class Process {

  public readonly id: number;
  public readonly name: string;
  public readonly ins: number[];
  public readonly outs: number[];

  private cpuRequest: string = "";
  private memRequest: string = "";

  private startTime?: timestamp;
  private endTime?: timestamp;

  /**
   * Constructor - it also allows copying object .
   */
  public constructor(process: HFProcess | Process, id?: number) {
    if (process instanceof Process) {
      this.id = process.id;
      this.name = process.name;
      this.ins = [...process.ins];
      this.outs = [...process.outs];
      this.cpuRequest = process.cpuRequest;
      this.memRequest = process.memRequest;
      this.startTime = (process.startTime) ? process.startTime : undefined;
      this.endTime = (process.endTime) ? process.endTime : undefined;
    } else {
      if (id === undefined) {
        throw Error("ID is required for Process");
      }
      this.id = id;
      this.name = process.name;
      this.ins = process.ins;
      this.outs = process.outs;
      this.assignRequests(process);
    }
  }

  /**
   * Assigns CPU/RAM requests to current instance.
   * @param hfProcess
   *
   * CAUTION: This implementation MUST be the same as in k8sJobSubmit(),
   *          otherwise we might get unexpected results.
   */
  private assignRequests(hfProcess: HFProcess) {
    /* Use zeroes in case of last (exit) process without defined executor. */
    if (hfProcess.function == "exit" && hfProcess?.config?.executor == undefined) {
      this.cpuRequest = "0";
      this.memRequest = "0";
      return;
    }

    let executor = hfProcess.config.executor;
    this.cpuRequest = executor.cpuRequest || process.env.HF_VAR_CPU_REQUEST || "0.5";
    this.memRequest = executor.memRequest || process.env.HF_VAR_MEM_REQUEST || "50Mi";
    return;
  }

  public markStart(time: timestamp): void {
    if (this.startTime !== undefined) {
      throw Error('Process already marked as started');
    }
    this.startTime = time;
    return;
  }

  public markEnd(time: timestamp): void {
    if (this.endTime !== undefined) {
      throw Error('Process ' + this.id.toString() + ' already marked as ended');
    }
    this.endTime = time;
    return;
  }

  public getCpuRequest(): string {
    return this.cpuRequest;
  }

  public getMemRequest(): string {
    return this.memRequest;
  }

  public getStartTime(): timestamp | undefined {
    return this.startTime;
  }

  public getEndTime(): timestamp | undefined {
    return this.endTime;
  }
}

export default Process;
