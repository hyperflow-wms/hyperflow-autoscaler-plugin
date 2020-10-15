import Loggers from '../logger';
import Workflow from "./workflow";
import WorkflowTracker from "./tracker";
import EstimatorInterface from './estimatorInterface';
import StaticEstimator from './staticEstimator';
import Utils from '../utils';

export interface Demand {
  cpuMillis: number;
  memBytes: number;
}

class Plan
{
  private wf: Workflow;
  private tracker: WorkflowTracker;
  private timeForwardMs: number;
  private estimator: EstimatorInterface;

  private procHistory: Map<number, Set<number>>;

  constructor(wf: Workflow, tracker: WorkflowTracker, timeForwardMs: number, estimator: EstimatorInterface) {
    Loggers.base.silly("[Plan] Constructor");
    this.wf = wf;
    this.tracker = tracker;
    this.timeForwardMs = timeForwardMs;
    this.estimator = estimator;
    this.procHistory = new Map();
  }

  /**
   * Runs planning.
   * @param sendAllInputs whether '-s' options is present
   */
  public run(sendAllInputs: boolean = false): void {

    /* Reset procHistory - allow to execute 'run' many times. */
    this.procHistory = new Map();

    /* If execution not started, then start it and send input signals. */
    if (this.tracker.getExecutionStartTime() == undefined) {
      Loggers.base.debug("[Plan] Simulating workflow start");
      let intitialSigIds = this.wf.getInitialSigIds();
      if (sendAllInputs == true) {
        let inputSigIds = this.wf.getWfInsSigIds();
        intitialSigIds.concat(inputSigIds);
      }
      let timeNow = new Date();
      this.tracker.notifyStart(timeNow);
      intitialSigIds.forEach(el => this.tracker.notifyInitialSignal(el, timeNow));
    }

    /* Get execution start. */
    let executionStartTime = this.tracker.getExecutionStartTime();
    if (executionStartTime === undefined) {
      throw Error("After notyfing start, the execution start should be already set!");
    }

    /* Cyclic: grab running processes and fast-forward them with estimations. */
    const BreakException = {};
    try {
      while (true) {
        /* Predict end time of each process. */
        let endedProcessesMap = new Map<number, number[]>();
        let processIds = this.tracker.getRunningProcessIds();
        if (processIds.size == 0) {
          Loggers.base.debug("[Plan] No more processes - stopping analyze");
          break;
        }
        Loggers.base.debug("[Plan] Looking for first expected execution among processes " + Array.from(processIds.values()).join(","));
        processIds.forEach((processId) => {
          let process = this.tracker.getProcessById(processId);
          if (process === undefined) {
            throw Error("Process " + processId.toString() + " not found");
          }
          let processStartTime = process.getStartTime();
          if (processStartTime === undefined) {
            throw Error("Running process must have 'start time'");
          }
          Loggers.base.debug("[Plan] Saving start of " + processId.toString() + " " + processStartTime);
          this.saveProcessStartEvent(processId, processStartTime);

          /* Stop if we go further in time than it was allowed. */
          if (executionStartTime == undefined) {
            throw Error("Fatal error - no execution start time defined");
          }
          let totalPlanningTime = processStartTime.getTime() - executionStartTime.getTime();
          if (totalPlanningTime > this.timeForwardMs) {
            Loggers.base.debug("[Plan] Stopping analyze - we reached " + totalPlanningTime.toString() + " ms");
            throw BreakException;
          }

          /* Calculate estimated end time and update map. */
          let estimatedMs = this.estimator.getEstimationMs(process);
          let expectedEndTimeMs = processStartTime.getTime() + estimatedMs;
          if (endedProcessesMap.has(expectedEndTimeMs) == false) {
            endedProcessesMap.set(expectedEndTimeMs, []);
          }
          endedProcessesMap.get(expectedEndTimeMs)?.push(processId);
        });

        /* Notify tracker about finished process(es),
        * we want to preserve order of fired signals,
        * so we sort them by end time and pick only
        * those with first end time. */
        let sortedKeys = Array.from(endedProcessesMap.keys()).sort();
        let endTimeMsKey = sortedKeys[0];
        let procIdArr = endedProcessesMap.get(endTimeMsKey);
        procIdArr?.forEach((procId) => {
          let endTime = new Date(endTimeMsKey);
          Loggers.base.debug("[Plan] Notifying about expected process " + procId.toString() + " finish at " + endTime.toString());
          this.tracker.notifyProcessFinished(procId, endTime);
          this.saveProcessEndEvent(procId, endTime);
          Loggers.base.debug("[Plan] Saving end of " + procId.toString() + " " + endTime);
        });
      }
    } catch (e) {
      if (e !== BreakException) {
        throw e;
      }
    }

    return;
  }

  /**
   * Stores process start time as positive number.
   */
  private saveProcessStartEvent(processId: number, processStartTime: Date): void {
    let timeMs = processStartTime.getTime();
    if (this.procHistory.has(timeMs) == false) {
      this.procHistory.set(timeMs, new Set());
    }
    this.procHistory.get(timeMs)?.add(processId);
    return;
  }

  /**
   * Stores process end time as negative number (mulitplied with -1).
   */
  private saveProcessEndEvent(processId: number, processEndTime: Date): void {
    let timeMs = processEndTime.getTime();
    if (this.procHistory.has(timeMs) == false) {
      this.procHistory.set(timeMs, new Set());
    }
    this.procHistory.get(timeMs)?.add(processId * -1);
    return;
  }

  /**
   * Return change history (start/end of process), sorted by time.
   * Start of process is positive number, end is the negative one.
   */
  public getChangeHistory() {
    let procHistorySorted: Map<number, Set<number>> = new Map();
    let sortedKeys = Array.from(this.procHistory.keys()).sort();
    sortedKeys.forEach((timeKeyMs) => {
      procHistorySorted.set(timeKeyMs, this.procHistory.get(timeKeyMs) || new Set());
    });
    return procHistorySorted;
  }

  /**
   * Returns state history - time frames and corresponding running
   * process ids.
   * It's sorted by default.
   */
  public getStateHistory(): Map<number, Set<number>> {
    let states = new Map<number, Set<number>>();
    let workingSet = new Set<number>();
    let history = this.getChangeHistory();
    history.forEach((procIds, timeKey) => {
      /* We have to process 'start process' before 'end process',
      * in one key, we might get both start and end. */
      let procIdsArr = Array.from(procIds);
      procIdsArr.filter(x => x > 0).forEach((procId) => workingSet.add(procId));
      procIdsArr.filter(x => x < 0).forEach((procId) => workingSet.delete(procId*(-1)));
      states.set(timeKey, new Set(workingSet));
    });
    return states;
  }

  public getDemandFrames(): Map<number, Demand> {
    let frames = new Map<number, Demand>();

    let stateHistory = this.getStateHistory();
    stateHistory.forEach((procIds, timeKeyMs) => {
      let totalCpuMillis = 0;
      let totalMemBytes = 0;

      procIds.forEach((procId) => {
        let process = this.tracker.getProcessById(procId);
        if (process == undefined) {
          throw Error("Process " + procId.toString() + " not found");
        }
        let cpuRequest = Utils.cpuStringToMillis(process.getCpuRequest());
        if (cpuRequest instanceof Error) {
          throw cpuRequest;
        }
        let memRequest = Utils.memoryStringToBytes(process.getMemRequest());
        if (memRequest instanceof Error) {
          throw memRequest;
        }
        totalCpuMillis += cpuRequest;
        totalMemBytes += memRequest;
      });

      frames.set(timeKeyMs, {"cpuMillis": totalCpuMillis, "memBytes": totalMemBytes});
    });

    return frames;
  }
}

export default Plan;

async function test() {
  let wfDir = '/home/andrew/Projects/master-thesis/hyperflow/source/examples/Test';
  let workflow = Workflow.createFromFile(wfDir);
  let tracker = new WorkflowTracker(workflow);

  // Optionals steps
  tracker.notifyStart(new Date());
  for (let sigId of [1,4,5,8,11,14,17,20,23,26,29,32,33,68,70,92,94]) {
    tracker.notifyInitialSignal(sigId, new Date());
  }
  for (let procId of [1,2,3,4,5,6,7,8,9,10,11,12,14]) {
    let randDelay = Math.floor(Math.random() * 500);
    await new Promise((res, rej) => { setTimeout(res, randDelay); });
    tracker.notifyProcessFinished(procId, new Date());
  }

  let estimator = new StaticEstimator();
  let plan = new Plan(workflow, tracker, 50000, estimator);
  plan.run();

  console.log('Process prediction:');
  console.log(plan.getStateHistory());
  console.log('Demand prediction:');
  console.log(plan.getDemandFrames());
}

test();
