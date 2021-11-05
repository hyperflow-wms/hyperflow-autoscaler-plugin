import Process from '../tracker/process';

interface EstimatorInterface {
  getName(): string;
  getEstimationMs(p: Process): number;
}

export default EstimatorInterface;
