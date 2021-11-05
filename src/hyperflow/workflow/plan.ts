import { getBaseLogger } from '../../utils/logger';
import Workflow from '../tracker/workflow';
import WorkflowTracker from '../tracker/tracker';
import EstimatorInterface from '../estimators/estimatorInterface';
import ResourceRequirements from '../../kubernetes/resourceRequirements';

const Logger = getBaseLogger();

type timestamp = number;

class Plan {
  private wf: Workflow;
  private tracker: WorkflowTracker;
  private timeForwardMs: number;
  private estimator: EstimatorInterface;

  // History of processes' start and stop; not sorted
  private procHistory: Map<number, Set<number>>;

  constructor(
    wf: Workflow,
    tracker: WorkflowTracker,
    timeForwardMs: number,
    estimator: EstimatorInterface
  ) {
    Logger.trace('[Plan] Constructor');
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
  public run(sendAllInputs = false): void {
    /* Reset procHistory - allow to execute 'run' many times. */
    this.procHistory = new Map();

    /* If execution not started, then start it and send input signals. */
    if (this.tracker.getExecutionStartTime() == undefined) {
      Logger.debug('[Plan] Simulating workflow start');
      let intitialSigIds = this.wf.getInitialSigIds();
      if (sendAllInputs == true) {
        const inputSigIds = this.wf.getWfInsSigIds();
        intitialSigIds = intitialSigIds.concat(inputSigIds);
      }
      const timeNow = new Date().getTime();
      this.tracker.notifyStart(timeNow);
      intitialSigIds.forEach((el) =>
        this.tracker.notifyInitialSignal(el, timeNow)
      );
    }

    /* Get execution start. */
    const executionStartTime = this.tracker.getExecutionStartTime();
    if (executionStartTime === undefined) {
      throw Error(
        'After notyfing start, the execution start should be already set!'
      );
    }

    /* TMP FIX: we do not know when process was really started, so we suppose all just started.
     * To achieve thse, we reset all start times in 'process' + procHistory.... */
    this.tracker.resetAllRunningProcesses();

    /* Cyclic: grab running processes and fast-forward them with estimations. */
    const BreakException = {};
    try {
      const REF_runningProcessIds = this.tracker.getRunningProcessIds();
      while (REF_runningProcessIds.size > 0) {
        /* Predict end time of each process. */
        Logger.debug(
          '[Plan] Fast-forwarding execution of processes ' +
            Array.from(REF_runningProcessIds.values()).join(',')
        );
        REF_runningProcessIds.forEach((processId) => {
          const process = this.tracker.getProcessById(processId);
          if (process === undefined) {
            throw Error('Process ' + processId.toString() + ' not found');
          }
          const processStartTime = process.getStartTime(); // hmm the problem is we don't get run time, but createJob request time...
          if (processStartTime === undefined) {
            throw Error("Running process must have 'start time'");
          }
          Logger.debug(
            '[Plan] Saving start of ' +
              processId.toString() +
              ' ' +
              processStartTime.toString()
          );
          this.saveProcessStartEvent(processId, processStartTime);

          /* Stop if we go further in time than it was allowed. */
          if (executionStartTime == undefined) {
            throw Error('Fatal error - no execution start time defined');
          }
          //const totalPlanningTime = processStartTime - executionStartTime;
          //if (totalPlanningTime > this.timeForwardMs) {
          //  Logger.debug("[Plan] Stopping analyze - we reached " + totalPlanningTime.toString() + " ms");
          //  throw BreakException;
          //}

          /* Calculate estimated end time and notify tracker
           * about finished process(es). We do not care about
           * order, as events will be sorted later. */
          const estimatedMs = this.estimator.getEstimationMs(process);
          const expectedEndTimeMs = processStartTime + estimatedMs;
          Logger.debug(
            '[Plan] Notifying about expected process ' +
              processId.toString() +
              ' finish at ' +
              expectedEndTimeMs.toString()
          );
          this.tracker.notifyProcessFinished(processId, expectedEndTimeMs); // NOTE: We do not care about newProcIds because we use tracker reference to get running pid
          this.saveProcessEndEvent(processId, expectedEndTimeMs);
          Logger.debug(
            '[Plan] Saving end of ' +
              processId.toString() +
              ' ' +
              expectedEndTimeMs
          );
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
  private saveProcessStartEvent(processId: number, timeMs: timestamp): void {
    if (this.procHistory.has(timeMs) == false) {
      this.procHistory.set(timeMs, new Set());
    }
    this.procHistory.get(timeMs)?.add(processId);
    return;
  }

  /**
   * Stores process end time as negative number (mulitplied with -1).
   */
  private saveProcessEndEvent(processId: number, timeMs: timestamp): void {
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
  public getChangeHistory(): Map<number, Set<number>> {
    const procHistorySorted: Map<number, Set<number>> = new Map();
    const sortedKeys = Array.from(this.procHistory.keys()).sort();
    sortedKeys.forEach((timeKeyMs) => {
      procHistorySorted.set(
        timeKeyMs,
        this.procHistory.get(timeKeyMs) || new Set()
      );
    });
    return procHistorySorted;
  }

  /**
   * Returns state history - time frames and corresponding running
   * process ids.
   * It's sorted by default.
   * CAUTION: This function is heavy for memory, eg. it takes
   *  0.5GB of memory for montage-2mass_2.0.
   */
  public getStateHistory(): Map<number, Set<number>> {
    const states = new Map<number, Set<number>>();
    const workingSet = new Set<number>();
    const history = this.getChangeHistory();
    history.forEach((procIds, timeKey) => {
      /* We have to process 'start process' before 'end process',
       * in one key, we might get both start and end. */
      const procIdsArr = Array.from(procIds);
      procIdsArr
        .filter((x) => x > 0)
        .forEach((procId) => workingSet.add(procId));
      procIdsArr
        .filter((x) => x < 0)
        .forEach((procId) => workingSet.delete(procId * -1));
      states.set(timeKey, new Set(workingSet));
    });
    return states;
  }

  public getDemandFrames(): Map<number, ResourceRequirements[]> {
    const frames = new Map<number, ResourceRequirements[]>();

    const currentUsage = new ResourceRequirements({ cpu: '0', mem: '0' });
    const history = this.getChangeHistory();
    history.forEach((procMarkers, timeKey) => {
      /* Positive value means process started working at given time,
       * negative that it finished. */
      procMarkers.forEach((procMarker) => {
        const procId = Math.abs(procMarker);
        const process = this.tracker.getProcessById(procId);
        if (process == undefined) {
          throw Error('Process ' + procId.toString() + ' not found');
        }
        const cpuVal = ResourceRequirements.Utils.parseCpuString(
          process.getCpuRequest()
        );
        const memVal = ResourceRequirements.Utils.parseMemString(
          process.getMemRequest()
        );
        if (procMarker > 0) {
          currentUsage.add(cpuVal, memVal);
        } else {
          currentUsage.add(cpuVal * -1, memVal * -1);
        }
      });
      const frameVal = [currentUsage.clone()]; // We wrap object with array to preserve compatibility with existing code
      frames.set(timeKey, frameVal);
    });

    return frames;
  }
}

export default Plan;
