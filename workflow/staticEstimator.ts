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
}

class StaticEstimator implements EstimatorInterface {
  public getName() {
    return "Static";
  }

  public getEstimationMs(p: Process): number {
    if (! (p.name in lut) ) {
      throw Error("No estimates known for process " + p.name);
    }
    let estimation = lut[p.name];
    return estimation;
  }
}
