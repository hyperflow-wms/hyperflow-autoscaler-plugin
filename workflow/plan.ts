import Loggers from '../logger';
import Workflow from "./workflow";
import WorkflowTracker from "./tracker";
import EstimatorInterface from './estimatorInterface';
import StaticEstimator from './staticEstimator';

class Plan
{
  private wf: Workflow;
  private tracker: WorkflowTracker;
  private timeForwardMs: number;
  private estimator: EstimatorInterface;

  constructor(wf: Workflow, tracker: WorkflowTracker, timeForwardMs: number, estimator: EstimatorInterface) {
    Loggers.base.silly("[Plan] Constructor");
    this.wf = wf;
    this.tracker = tracker;
    this.timeForwardMs = timeForwardMs;
    this.estimator = estimator;
  }

  /**
   * Runs planning.
   * @param sendAllInputs whether '-s' options is present
   */
  public run(sendAllInputs: boolean = false): void {

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
        });
      }
    } catch (e) {
      if (e !== BreakException) {
        throw e;
      }
    }

    return;
  }
}

export default Plan;

async function test() {
  let wfDir = '/home/andrew/Projects/master-thesis/hyperflow/source/examples/Test';
  let workflow = Workflow.createFromFile(wfDir);
  let tracker = new WorkflowTracker(workflow);
  let estimator = new StaticEstimator();
  let plan = new Plan(workflow, tracker, 50000, estimator);
  plan.run();
}

test();
