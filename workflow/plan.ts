import Loggers from '../logger';
import Workflow from "./workflow";
import WorkflowTracker from "./tracker";

class Plan
{
  private wf: Workflow;
  private tracker: WorkflowTracker;
  private timeForwardMs: number;

  constructor(wf: Workflow, tracker: WorkflowTracker, timeForwardMs: number) {
    Loggers.base.silly("[Plan] Constructor");
    this.wf = wf;
    this.tracker = tracker;
    this.timeForwardMs = timeForwardMs;
  }

  /**
   * Runs planning.
   * @param sendAllInputs whether '-s' options is present
   */
  public run(sendAllInputs: boolean = false): void {

    let planningStartTime = new Date();

    /* If execution not started, then start it and send input signals. */
    let executionStartTime = this.tracker.getExecutionStartTime();
    if (executionStartTime == undefined) {
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

    /* Cyclic: grab running processes and fast-forward them with estimations. */
    while (true) {
      /* Stop if we go further in time than it was allowed. */
      let timeNow = new Date();
      let totalPlanningTime = timeNow.getTime() - planningStartTime.getTime();
      if (totalPlanningTime > this.timeForwardMs) {
        Loggers.base.debug("[Plan] Stopping analyze - we reached " + totalPlanningTime.toString() + " ms");
        break;
      }

      /* Predict end time of each process. */
      let endedProcessesMap = new Map<Date, number[]>();
      let processIds = this.tracker.getRunningProcessIds();
      if (processIds.size == 0) {
        Loggers.base.debug("[Plan] No more processes - stopping analyze");
        break;
      }
      Loggers.base.debug("[Plan] Forwarding execution of processes " + Array.from(processIds.values()).join(","));
      processIds.forEach((processId) => {
        let process = this.tracker.getProcessById(processId);
        if (process === undefined) {
          throw Error("Process " + processId.toString() + " not found");
        }
        let processName = process.name;
        let processStartTime = process.getStartTime();
        if (processStartTime === undefined) {
          throw Error("Running process must have 'start time'");
        }

        // TODO use estimator instead of 3000 ms.
        let expectedEndTime = new Date(processStartTime.getTime() + 3000);

        if (endedProcessesMap.has(expectedEndTime) == false) {
          endedProcessesMap.set(expectedEndTime, []);
        }
        endedProcessesMap.get(expectedEndTime)?.push(processId);
      });

      /* Notify tracker about finished process,
       * we want to preserve order of fired signals,
       * so we sort them by end time. */
      let sortedKeys = Array.from(endedProcessesMap.keys()).sort();
      sortedKeys.forEach((endTime) => {
        let procIdArr = endedProcessesMap.get(endTime);
        procIdArr?.forEach((procId) => {
          Loggers.base.debug("[Plan] Notifying about expected process " + procId.toString() + " finish at " + endTime.toString());
          this.tracker.notifyProcessFinished(procId, endTime);
        });
      });
    }
    return;
  }
}

export default Plan;

async function test() {
  let wfDir = '/home/andrew/Projects/master-thesis/hyperflow/source/examples/Test';
  let workflow = Workflow.createFromFile(wfDir);
  let tracker = new WorkflowTracker(workflow);
  let plan = new Plan(workflow, tracker, 50000);
  plan.run();
}

test();
