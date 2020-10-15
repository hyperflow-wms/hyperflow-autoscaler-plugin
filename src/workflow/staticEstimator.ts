import Process from './process';
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

class StaticEstimator implements EstimatorInterface {
  public getName() {
    return "Static";
  }

  public getEstimationMs(p: Process): number {
    if (! (p.name in lut) ) {
      throw Error("No estimates known for process " + p.name);
    }
    let estimation = lut[p.name];

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

export default StaticEstimator;
