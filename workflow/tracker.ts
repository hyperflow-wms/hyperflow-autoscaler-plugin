import { HFWorkflow } from "../types";
import Loggers from '../logger';
import Process from "./process";
import Signal from "./signal";
import Workflow from "./workflow";

import * as fs from "fs";
import * as pathtool from "path";
import { Logger } from "log4js";

class WorkflowTracker
{
  private executionStartTime: Date;

  private processesMap: Map<number, Process> = new Map;
  private signalsMap: Map<number, Signal> = new Map;

  // lookup between processes and signals edges
  private processToPrevSignal: Map<number, number[]> = new Map;
  private processToNextSignal: Map<number, number[]> = new Map;
  private signalToPrevProcess: Map<number, number[]> = new Map;
  private signalToNextProcess: Map<number, number[]> = new Map;

  private runningProcesses: object; // TODO

  constructor(directory: string) {
    Loggers.base.silly("[WorkflowTracker] Constructor");
    this.runningProcesses = {};
    let wf = this.readHFFile(directory);
    this.loadWorkflow(wf);
  }

  /**
   * Notifies tracker about execution start.
   * @param time event time
   */
  public notifyStart(time: Date) {
    this.executionStartTime = time;
  }

  /**
   * Notifies tracker about emitted input signal.
   * @param sigId signal ID
   * @param time event time
   */
  public notifyInitialSignal(sigId: number, time: Date) {
    Loggers.base.debug("[WorkflowTracker] Notified about signal " + sigId.toString() + " emit");
    let signal = this.signalsMap.get(sigId);
    if (signal === undefined) {
      throw Error("Signal " + sigId.toString() + " not found");
    }
    if (signal.wasEmitted() == true) {
      Loggers.base.warn("[WorkflowTracker] Signal " + sigId.toString() + " was already emitted");
      return;
    }
    signal.markEmit(time);

    /* Fire next processes. */
    let nextProcessIds = this.signalToNextProcess.get(sigId);
    if (nextProcessIds === undefined) {
      throw Error("No mapping found - even empty array must be specified!");
    }
    for (let processId of nextProcessIds) {
      this.startProcessIfReady(processId, time);
    }

    return;
  }

  /**
   * Notifies tracker about finished process.
   * @param procId process ID
   * @param time event time
   */
  public notifyProcessFinished(procId: number, time: Date) {
    Loggers.base.debug("[WorkflowTracker] Notified about process " + procId.toString() + " finish");
    let process = this.processesMap.get(procId);
    if (process === undefined) {
      throw Error("Process " + procId.toString() + " not found");
    }
    delete this.runningProcesses[procId];
    process.markEnd(time);

    /* We have to fire next signals manually, because
     * without log provenance we can get only initial ones. */
    let nextSignalIds = this.processToNextSignal.get(procId);
    if (nextSignalIds === undefined) {
      throw Error("No mapping found - even empty array must be specified!");
    }
    for (let signalId of nextSignalIds) {
      this.notifyInitialSignal(signalId, time);
    }

    return;
  }

  /**
   * Starts process, only if all input signals are ready.
   * @param procId process ID
   * @param time start time
   */
  private startProcessIfReady(procId: number, time: Date) {
    let process = this.processesMap.get(procId);
    if (process === undefined) {
      throw Error("Process " + procId.toString() + " not found");
    }
    let prevSignalIds = this.processToPrevSignal.get(procId);
    if (prevSignalIds === undefined) {
      throw Error("No mapping found - even empty array must be specified!");
    }
    let emitStates = prevSignalIds.map((sigId) => this.signalsMap.get(sigId)?.wasEmitted());
    let notEmittedSignals = emitStates.filter(x => x == false).length;
    if (notEmittedSignals == 0) {
      Loggers.base.debug("[WorkflowTracker] Firing process " + procId.toString() + " - all ins are ready");
      process.markStart(time);
      this.runningProcesses[procId] = true;
    }
    return;
  }

  /**
   * Temporary debug function.
   * TODO: remove.
   */
  public printState() {
    Loggers.base.debug("[WorkflowTracker] Already running tasks: " + Object.keys(this.runningProcesses).length.toString());
  }

  /**
   * Reads HyperFlow's workflow.json.
   * @param directory Workflow root directory
   */
  private readHFFile(directory: string): Workflow {
    Loggers.base.debug("[WorkflowTracker] Reading HF workflow from " + directory);
    let wfFile = pathtool.join(directory, "workflow.json");
    let wfFileContent = fs.readFileSync(wfFile, 'utf8');
    let rawWf = JSON.parse(wfFileContent);
    let wf = new Workflow(rawWf);

    return wf;
  }

  /**
   * Loads HyperFlow's workflow into this instance.
   * @param wf workflow
   */
  private loadWorkflow(wf: Workflow): void {

    Loggers.base.debug("[WorkflowTracker] Parsing workflow into graph");

    let signals = wf.getSignals();
    let processes = wf.getProcesses();

    processes.forEach((proc) => {
      this.processesMap.set(proc.id, proc);
      this.processToPrevSignal.set(proc.id, []);
      this.processToNextSignal.set(proc.id, []);
    });
    signals.forEach((sig) => {
      this.signalsMap.set(sig.id, sig);
      this.signalToPrevProcess.set(sig.id, []);
      this.signalToNextProcess.set(sig.id, []);
    });
    processes.forEach((proc) => {
      (proc.ins||[]).forEach((insig) => {
        this.processToPrevSignal.get(proc.id)?.push(insig);
        this.signalToNextProcess.get(insig)?.push(proc.id);
      });
      (proc.outs||[]).forEach((outsig) => {
        this.processToNextSignal.get(proc.id)?.push(outsig);
        this.signalToPrevProcess.get(outsig)?.push(proc.id);
      });
    });

    return;
  }
}

export default WorkflowTracker;
