import Loggers from './logger';
import K8sClient from './k8sClient';
import Utils from "./utils";

import k8s = require('@kubernetes/client-node');

interface ClusterState {
  lastUpdate: Date;
  workerNodes: k8s.V1NodeList;
  pods: k8s.V1PodList;
}
abstract class BaseProvider {
  protected client: K8sClient;
  protected clusterState: ClusterState;

  constructor() {
    Loggers.base.silly("[BaseProvider] Constructor");
    this.client = new K8sClient();
  }

  protected abstract getNodeCpu(V1Node): number | Error;
  protected abstract getNodeMemory(V1Node): number | Error;

  public abstract resizeCluster(nodes: number): void | Error;
  public abstract getNumReadyWorkers(): number | Error;
  public abstract getNumAllWorkers(): number | Error;

  /**
   * Saves cluster state into internal structure.
   */
  public async updateClusterState(): Promise<void> {
    Loggers.base.info("[BaseProvider] Updating cluster state");
    let currentTime = new Date();
    let promise1 = this.client.fetchWorkerNodes();
    let promise2 = this.client.fetchPods();
    let workerNodes;
    let pods;
    [workerNodes, pods] = await Promise.all([promise1, promise2]);
    this.clusterState = {
      lastUpdate: currentTime,
      workerNodes: workerNodes,
      pods: pods,
    };
    Loggers.base.info("[BaseProvider] Cluster state updated");

    return;
  }

  public async getSupply(): Promise<number[] | Error> {
    let nodeList = await this.client.fetchWorkerNodes();

    if (nodeList instanceof Error) {
      return Error("Unable to get worker nodes:\n" + nodeList.message)
    }

    let totalCpu = 0;
    let totalMemory = 0;

    let schedulableNodes = 0;

    for (let node of nodeList) {
      let allocatable = node?.status?.allocatable; // allocatable = capacity - reserved
      if (allocatable == undefined) {
        return Error("Unable to get status.allocatable from node");
      }
      let cpu = this.getNodeCpu(node);
      if (cpu instanceof Error) {
        return Error("Unable to get node's CPU status:\n" + cpu.message)
      }
      let memory = this.getNodeMemory(node);
      if (memory instanceof Error) {
        return Error("Unable to get node's memory status:\n" + memory.message)
      }
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        return Error("Unable to get metadata.name from node");
      }
      Loggers.base.debug('Node data: ' + nodeName + ' -> CPU: ' + cpu + ' RAM: ' + memory + ' bytes');
      let nodeSpec = node?.spec;
      if (nodeSpec == undefined) {
        return Error("Unable to get spec from node");
      }
      let unschedulableProp = nodeSpec.unschedulable;
      if (unschedulableProp == true) {
        Loggers.base.debug("Unschedulable node here");
      } else {
        schedulableNodes += 1;
        totalCpu += cpu;
        totalMemory += memory;
      }
    }
    Loggers.base.debug("Found " + nodeList.length + " nodes (" + schedulableNodes + " schedulable)");
    Loggers.base.debug("Total supply: " + totalCpu + ' ' + totalMemory);

    return [totalCpu, totalMemory];
  }

  public async getDemand(): Promise<number[] | Error> {
    let podList = await this.client.fetchPods();

    let totalCpu = 0;
    let totalMemory = 0;
    for (let pod of podList) {
      let containers = pod?.spec?.containers;
      if (containers == undefined) {
        return Error("Unable to get spec.containers from pod");
      }
      for (let container of containers) {
        //let limits = container.resources.limits;
        let requests = container?.resources?.requests;
        if (requests == undefined) {
          return Error("Unable to get resources.requests from container");
        }
        if (requests != undefined) {
          if (requests.cpu != undefined) {
            let cpu = Utils.cpuStringToNum(requests.cpu);
            if (cpu instanceof Error) {
              return Error("Unable to convert CPU string:\n" + cpu.message)
            }
            totalCpu += cpu;
          }
          if (requests.memory != undefined) {
            let memory = Utils.memoryStringToBytes(requests.memory);
            if (memory instanceof Error) {
              return Error("Unable to convert memory string:\n" + memory.message)
            }
            totalMemory += memory;
          }
        }
      }
    }
    return [totalCpu, totalMemory];
  }
}

export default BaseProvider;
