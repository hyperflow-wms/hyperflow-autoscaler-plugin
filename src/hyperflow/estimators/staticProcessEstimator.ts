import Process from '../tracker/process';
import EstimatorInterface from './estimatorInterface'

let lut = {
  "mViewer": 900,
  "mBackground": 400,
  "mProjectPP": 800,
  "mDiffFit": 100,
  "mConcatFit": 300,
  "mBgModel": 1100,
  "mShrink": 200,
  "mImgtbl": 300,
  "mAdd": 500,
  "Done": 0,
}

const DELAYS_OVERHEAD = 2000;
const RANDOM_DISTRIBUTION = 0.02;

class StaticProcessEstimator implements EstimatorInterface {
  public getName() {
    return "StaticProcess";
  }

  public getEstimationMs(p: Process): number {
    if (! (p.name in lut) ) {
      throw Error("No estimates known for process " + p.name);
    }
    let estimation = lut[p.name];

    /**
     * We want to make estimations more real,
     * by changing total time by a few percent.
     */
    let notIdealFactor = 1 + (RANDOM_DISTRIBUTION * (Math.random()*2-1));
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

export default StaticProcessEstimator;
