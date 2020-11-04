import Process from '../tracker/process';
import EstimatorInterface from './estimatorInterface'

let lut = {
  // Ellipsoids (64)
  ///*
  "generateData": 0.1 * 1000,
  "create_dat_*": 0.05 * 1000,
  "execute_case_*": 0.4 * 1000,
  "average_result_*": 0.1 * 1000,
  "summary": 0.1 * 1000,
  //*/

  // KINC (20 000)
  ///*
  "kinc-wrapper": 21 * 1000,
  //*/

  // Montage (2.0)
  /*
  "mProjectPP": 0.7 * 1000,
  "mDiffFit": 0.1 * 1000,
  "mConcatFit": 12 * 1000,
  "mBgModel": 31.1 * 1000,
  "mBackground": 0.4 * 1000,
  "mImgtbl": 2.3 * 1000,
  "mAdd": 20.4 * 1000,
  "mShrink": 2 * 1000,
  "mViewer": 1.2 * 1000,
  */

  // Montage-2MASS (1.0)
  /*
  "mProject": 14.3 * 1000,
  "mDiffFit": 0.2 * 1000,
  "mConcatFit": 15.5 * 1000,
  "mBgModel": 32.8 * 1000,
  "mBackground": 0.4 * 1000,
  "mImgtbl": 1.8 * 1000,
  "mAdd": 6.6 * 1000,
  "mViewer": 10.5 * 1000,
  */

  // Montage-SDSS (2.0)
  ///*
  "mProject": 246.1 * 1000,
  "mDiffFit": 0.2 * 1000,
  "mConcatFit": 17 * 1000,
  "mBgModel": 5.6 * 1000,
  "mBackground": 3.3 * 1000,
  "mImgtbl": 2.7 * 1000,
  "mAdd": 50.6 * 1000,
  "mViewer": 41.6 * 1000,
  //*/

  // SoyKB (104)
  ///*
  "alignment_to_reference": 2.6 * 1000,
  "sort_sam": 0.5 * 1000,
  "dedup": 1.5 * 1000,
  "add_replace" : 0.5 * 1000,
  "realign_target_creator": 128.5 * 1000,
  "indel_realign": 3.7 * 1000,
  "haplotype_caller": 54.7 * 1000,
  "merge_gcvf": 96.0 * 1000,
  "genotype_gvcfs": 67.1 * 1000,
  "combine_variants": 4.9 * 1000,
  "select_variants_snp": 38.8 * 1000,
  "filtering_snp": 3.9 * 1000,
  "select_variants_indel": 38.2,
  "filtering_indel": 3.7 * 1000,
  //*/

  // -- other --
  "Done": 0,
}

const DELAYS_OVERHEAD = 2000;
const RANDOM_DISTRIBUTION = 0.02;

class StaticProcessEstimator implements EstimatorInterface {
  public getName() {
    return "StaticProcess";
  }

  public getEstimationMs(p: Process): number {
    let name = p.name;

    /* Custom name processing (ellipsoids wf). */
    if (name.startsWith('create_dat_') == true) {
      name = "create_dat_*";
    } else if (name.startsWith('execute_case_') == true) {
      name = "execute_case_*";
    } else if (name.startsWith('average_result_') == true) {
      name = "average_result_*";
    }


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
