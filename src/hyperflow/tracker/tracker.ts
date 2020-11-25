import { getBaseLogger } from '../../utils/logger';
import Process from "./process";
import Signal from "./signal";
import Workflow from "./workflow";

const Logger = getBaseLogger();

type timestamp = number;

class WorkflowTracker
{
  // CAUTION: this is shared across object copies
  private workflow: Workflow;

  private executionStartTime?: timestamp;

  private processesMap: Map<number, Process> = new Map;
  private signalsMap: Map<number, Signal> = new Map;

  // lookup between processes and signals edges
  private processToPrevSignal: Map<number, number[]> = new Map;
  private processToNextSignal: Map<number, number[]> = new Map;
  private signalToPrevProcess: Map<number, number[]> = new Map;
  private signalToNextProcess: Map<number, number[]> = new Map;

  private runningProcesses: Set<number>;

  /**
   * Constructor of WorkflowTracker - allows copying when passing class instance.
   * @param wfOrTracker
   */
  constructor(wfOrTracker: Workflow | WorkflowTracker) {
    if (wfOrTracker instanceof WorkflowTracker) {
      Logger.trace("[WorkflowTracker] Copy constructor");
      let oldWT = wfOrTracker;
      this.executionStartTime = (oldWT.executionStartTime) ? oldWT.executionStartTime : undefined;
      oldWT.processesMap.forEach((val, key) => {
        this.processesMap.set(key, new Process(val));
      });
      oldWT.signalsMap.forEach((val, key) => {
        this.signalsMap.set(key, new Signal(val));
      });
      this.processToPrevSignal = new Map(oldWT.processToPrevSignal);
      this.processToNextSignal = new Map(oldWT.processToNextSignal);
      this.signalToPrevProcess = new Map(oldWT.signalToPrevProcess);
      this.signalToNextProcess = new Map(oldWT.signalToNextProcess);
      this.runningProcesses = new Set(oldWT.runningProcesses);
      this.workflow = oldWT.workflow; // CAUTION: this is shared reference (const)
    } else {
      Logger.trace("[WorkflowTracker] Constructor");
      let wf = wfOrTracker;
      this.runningProcesses = new Set();
      this.loadWorkflow(wf);
    }
  }

  /**
   * Notifies tracker about execution start.
   * @param time event time
   */
  public notifyStart(time: timestamp) {
    this.executionStartTime = time;
  }

  /**
   * Notifies tracker about emitted input signal.
   * @param sigId signal ID
   * @param time event time
   * @return array of newly started processes
   */
  public notifyInitialSignal(sigId: number, time: timestamp): number[] {
    Logger.debug("[WorkflowTracker] Notified about signal " + sigId.toString() + " emit");
    let signal = this.signalsMap.get(sigId);
    if (signal === undefined) {
      throw Error("Signal " + sigId.toString() + " not found");
    }
    if (signal.wasEmitted() == true) {
      Logger.warn("[WorkflowTracker] Signal " + sigId.toString() + " was already emitted");
      return [];
    }
    signal.markEmit(time);

    /* Fire next processes. */
    let nextProcessIds = this.signalToNextProcess.get(sigId);
    if (nextProcessIds === undefined) {
      throw Error("No mapping found - even empty array must be specified!");
    }
    let startedProcessIds: number[] = [];
    for (let processId of nextProcessIds) {
      let started = this.startProcessIfReady(processId, time);
      if (started === true) {
        startedProcessIds.push(processId);
      }
    }

    return startedProcessIds;
  }

  /**
   * Notifies tracker about finished process.
   * @param procId process ID
   * @param time event time
   * @return array of newly started processes (consequence of passing signal)
   */
  public notifyProcessFinished(procId: number, time: timestamp): number[] {
    Logger.debug("[WorkflowTracker] Notified about process " + procId.toString() + " finish");
    let process = this.processesMap.get(procId);
    if (process === undefined) {
      throw Error("Process " + procId.toString() + " not found");
    }
    this.runningProcesses.delete(procId);
    process.markEnd(time);

    /* We have to fire next signals manually, because
     * without log provenance we can get only initial ones. */
    let nextSignalIds = this.processToNextSignal.get(procId);
    if (nextSignalIds === undefined) {
      throw Error("No mapping found - even empty array must be specified!");
    }
    let startedProcessIds: number[] = [];
    for (let signalId of nextSignalIds) {
      let sigStartedProcessIds = this.notifyInitialSignal(signalId, time);
      startedProcessIds = startedProcessIds.concat(sigStartedProcessIds);
    }

    return startedProcessIds;
  }

  /**
   * Starts process, only if all input signals are ready.
   * @param procId process ID
   * @param time start time
   * @return whether process was started
   */
  private startProcessIfReady(procId: number, time: timestamp): boolean {
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
      Logger.debug("[WorkflowTracker] Firing process " + procId.toString() + " - all ins are ready");
      process.markStart(time);
      this.runningProcesses.add(procId);
      return true;
    }
    return false;
  }

  public resetAllRunningProcesses() {
    let runningProcesses = this.runningProcesses;
    let newTime = (new Date()).getTime()
    runningProcesses.forEach((procId) => {
      this.processesMap.get(procId)?.forceMarkStart(newTime);
    });
    return;
  }

  /**
   * Temporary debug function.
   * TODO: remove.
   */
  public printState() {
    Logger.debug("[WorkflowTracker] Already running tasks: " + this.runningProcesses.size.toString());
  }

  /**
   * Loads HyperFlow's workflow into this instance.
   * @param wf workflow
   */
  private loadWorkflow(wf: Workflow): void {
    /* Make sure workflow was not already loaded. */
    if (this.workflow !== undefined) {
      throw Error("Workflow already loaded!");
    }
    this.workflow = wf;

    Logger.debug("[WorkflowTracker] Parsing workflow into graph");

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

  public getExecutionStartTime(): timestamp | undefined {
    return this.executionStartTime;
  }

  public getRunningProcessIds(): Set<number> {
    return this.runningProcesses;
  }

  public getProcessById(processId: number): Process | undefined {
    return this.processesMap.get(processId);
  }

  /**
   * Getter for workflow.
   */
  public getWorkflow() {
    return this.workflow;
  }
}

export default WorkflowTracker;
