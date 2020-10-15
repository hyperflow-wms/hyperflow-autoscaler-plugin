import Process from "./process";

interface EstimatorInterface {
  getName(): string;
  getEstimationMs(p: Process): number;
}

export default EstimatorInterface;
