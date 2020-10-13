import { HFWorkflow } from "../types";
import Loggers from '../logger';
import Process from "./process";
import Signal from "./signal";

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
    this.loadHFGraph(wf);
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
  private readHFFile(directory: string): HFWorkflow {
    Loggers.base.debug("[WorkflowTracker] Reading HF workflow from " + directory);
    let wfFile = pathtool.join(directory, "workflow.json");
    let wfFileContent = fs.readFileSync(wfFile, 'utf8');
    let wf = JSON.parse(wfFileContent);

    return wf;
  }

  /**
   * Loads HyperFlow's workflow into this instance.
   * @param wf workflow
   */
  private loadHFGraph(wf: HFWorkflow): void {

    Loggers.base.debug("[WorkflowTracker] Parsing HF workflow into graph");

    let signals = (wf.data || wf.signals || []);
    let processes = (wf.processes || wf.tasks || []);

    /* NOTE: HyperFlow uses 1-based indexing, so we use the same format. */
    processes.forEach((proc, idx) => {
      this.processesMap.set(idx+1, new Process(proc));
      this.processToPrevSignal.set(idx+1, []);
      this.processToNextSignal.set(idx+1, []);
    });
    signals.forEach((sig, idx) => {
      this.signalsMap.set(idx+1, new Signal(sig));
      this.signalToPrevProcess.set(idx+1, []);
      this.signalToNextProcess.set(idx+1, []);
    });
    processes.forEach((proc, idx) => {
      (proc.ins||[]).forEach((insig) => {
        this.processToPrevSignal.get(idx+1)?.push(insig+1);
        this.signalToNextProcess.get(insig+1)?.push(idx+1);
      });
      (proc.outs||[]).forEach((outsig) => {
        this.processToNextSignal.get(idx+1)?.push(outsig+1);
        this.signalToPrevProcess.get(outsig+1)?.push(idx+1);
      });
    });

    return;
  }
}

export default WorkflowTracker;


/**
 * TEST
 */
async function testMontage() {
  let ws = new WorkflowTracker('/home/andrew/Projects/master-thesis/workflows/montage_0.25');
  let printInterval = setInterval(() => {
    ws.printState();
  }, 500);

  ws.notifyStart(new Date());

  for (let sigId of [1,4,5,8,11,14,17,20,23,26,29,32,33,68,70,92,94]) {
    ws.notifyInitialSignal(sigId, new Date());
  }

  for (let procId of [1,2,3,4,5,6,7,8,9,10,11,12,14,16,13,17,19,21,20,22,23,15,18,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]) {
    let randDelay = Math.floor(Math.random() * 500);
    await new Promise((res, rej) => { setTimeout(res, randDelay); });
    ws.notifyProcessFinished(procId, new Date());
  }

  // what about some wait?
  clearInterval(printInterval);
}

testMontage();
