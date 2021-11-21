import Process from '../tracker/process';
import EstimatorInterface from './estimatorInterface';

/**
 * Average time of process in given workflow.
 * It should be calculated as N/L, where N is the number of tasks
 * on the critical path of the workflow, and L is the total
 * duration of the tasks on the critical path of the workflow.
 */
const lut = {
  'montage_0.25': 12000 / 50,
  'montage_1.0': 632000 / 650
};

const DELAYS_OVERHEAD = 2000;
const RANDOM_DISTRIBUTION = 0.02;

class StaticWorkflowEstimator implements EstimatorInterface {
  public getName(): string {
    return 'StaticWorkflow';
  }

  public getEstimationMs(p: Process): number {
    if (!(p.name in lut)) {
      throw Error('No estimates known for process ' + p.name);
    }
    let estimation = lut[p.name];

    /**
     * We want to make estimations more real,
     * by changing total time by a few percent.
     */
    const notIdealFactor = 1 + RANDOM_DISTRIBUTION * (Math.random() * 2 - 1);
    estimation = estimation * notIdealFactor;

    /* There are multiple additional delays for each task:
     * - time for container start/stop (pulling, executor overhead)
     * - time for passing messages via Redis
     * - time for propagating signals via HyperFlow
     * Some start/stop delays are compensated with 'job buffering',
     * Overall I add some extra time for each task. */
    estimation += DELAYS_OVERHEAD;

    return estimation;
  }
}

export default StaticWorkflowEstimator;
