import { HFProcess } from "../types";

class Process {

  public readonly name: string;
  public readonly ins: number[];
  public readonly outs: number[];

  private cpuRequest: string = "";
  private memRequest: string = "";

  private startTime?: Date;
  private endTime?: Date;

  public constructor(process: HFProcess) {
    this.name = process.name;
    this.ins = process.ins;
    this.outs = process.outs;
    this.assignRequests(process);
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

  public markStart(time: Date): void {
    if (this.startTime !== undefined) {
      throw Error('Process already marked as started');
    }
    this.startTime = time;
    return;
  }

  public markEnd(time: Date): void {
    if (this.endTime !== undefined) {
      throw Error('Process already marked as ended');
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
}

export default Process;
