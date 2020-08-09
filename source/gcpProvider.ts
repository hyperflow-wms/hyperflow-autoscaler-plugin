import BaseProvider from './baseProvider';
import Utils from "./utils";

class GCPProvider extends BaseProvider {
  constructor()
  {
    super();
  }

  protected getNodeCpu(node) {
    let allocatable = node.status.allocatable; // allocatable = capacity - reserved
    let cpu = Utils.cpuStringToNum(allocatable.cpu);
    return cpu;
  }

  protected getNodeMemory(node) {
    let allocatable = node.status.allocatable; // allocatable = capacity - reserved
    let memory = Utils.memoryStringToBytes(allocatable.memory);
    return memory;
  }

  public resizeCluster(workersNum) {
    return Error("Not implemented yet");
  }

  public getNumAllWorkers() {
    return Error("Not implemented yet");
  }

  public getNumReadyWorkers() {
    return Error("Not implemented yet");
  }
}

export default GCPProvider;
