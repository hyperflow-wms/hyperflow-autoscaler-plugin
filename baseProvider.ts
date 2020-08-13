import Loggers from './logger';
import K8sClient from './k8sClient';
import Utils from "./utils";

import k8s = require('@kubernetes/client-node');

interface ClusterState {
  lastUpdate: Date;
  workerNodes: k8s.V1Node[];
  pods: k8s.V1Pod[];
}
abstract class BaseProvider {
  protected client: K8sClient;
  protected clusterState: ClusterState;

  constructor() {
    Loggers.base.silly("[BaseProvider] Constructor");
    this.client = new K8sClient();
  }

  public abstract resizeCluster(nodes: number): void | Error;

  protected filterClusterState(nodes: Array<k8s.V1Node>, pods: Array<k8s.V1Pod>) {
    return this.client.filterHFWorkerNodes(nodes, pods);
  }

  /**
   * Saves cluster state into internal structure.
   */
  public async updateClusterState(): Promise<void | Error> {
    Loggers.base.info("[BaseProvider] Updating cluster state");
    let currentTime = new Date();
    let promise1 = this.client.fetchNodes();
    let promise2 = this.client.fetchPods();
    let nodes;
    let pods;
    [nodes, pods] = await Promise.all([promise1, promise2]);
    let hfView = this.filterClusterState(nodes, pods);
    if (hfView instanceof Error) {
      return Error("Unable to get hyperflow view on cluster: " + hfView.message);
    }
    this.clusterState = {
      lastUpdate: currentTime,
      workerNodes: hfView[0],
      pods: hfView[1],
    };
    Loggers.base.info("[BaseProvider] Cluster state updated");

    return;
  }

  /**
   * Gets CPU/Memory supply of last-known cluster state.
   */
  public getSupply(): number[] | Error {
    if (this.clusterState === undefined) {
      return Error("You have to fetch cluster state at first");
    }

    let totalCpu = 0;
    let totalMemory = 0;

    let nodes = this.clusterState.workerNodes;
    for (let node of nodes) {
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
      Loggers.base.debug('[BaseProvider] Extracted details of node ' + nodeName + ': CPU=' + cpu + 'B, RAM=' + memory + 'B');

      totalCpu += cpu;
      totalMemory += memory;
    }
    Loggers.base.debug("[BaseProvider] Total supply of " + nodes.length.toString() + ': CPU=' + totalCpu + 'B, RAM=' + totalMemory + 'B');

    return [totalCpu, totalMemory];
  }

  /**
   * Gets CPU/Memory demand of last-known cluster pods.
   */
  public getDemand(): number[] | Error {
    if (this.clusterState === undefined) {
      return Error("You have to fetch cluster state at first");
    }

    let totalCpu = 0;
    let totalMemory = 0;

    let pods = this.clusterState.pods;
    for (let pod of pods) {
      let nodeName = pod?.spec?.nodeName;
      if (nodeName == undefined) {
        return Error("Unable to get spec.nodeName from pod");
      }
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
            Loggers.base.debug("[BaseProvider] Extracted container CPU requests: " + cpu);
          }
          if (requests.memory != undefined) {
            let memory = Utils.memoryStringToBytes(requests.memory);
            if (memory instanceof Error) {
              return Error("Unable to convert memory string:\n" + memory.message)
            }
            totalMemory += memory;
            Loggers.base.debug("[BaseProvider] Extracted container memory requests: " + memory);
          }
        }
      }
    }
    Loggers.base.debug("[BaseProvider] Total demand of " + pods.length.toString() + ': CPU=' + totalCpu + 'B, RAM=' + totalMemory + 'B');

    return [totalCpu, totalMemory];
  }

  /**
   * Extracts amount of allocatable CPU from node item.
   */
  protected getNodeCpu(node: k8s.V1Node): number | Error {
    // NOTE: allocatable = capacity - reserved
    let allocatable = node?.status?.allocatable;
    if (allocatable === undefined) {
      return Error("Node has no status.allocatable details");
    }
    let cpu = Utils.cpuStringToNum(allocatable.cpu);
    return cpu;
  }

  /**
   * Extracts amount of allocatable memory from node item.
   */
  protected getNodeMemory(node: k8s.V1Node): number | Error {
    // NOTE: allocatable = capacity - reserved
    let allocatable = node?.status?.allocatable;
    if (allocatable === undefined) {
      return Error("Node has no status.allocatable details");
    }
    let memory = Utils.memoryStringToBytes(allocatable.memory);
    return memory;
  }

  /**
   * Gets list of worker nodes' names.
   */
  public getWorkerNodesNames(): string[] | Error {
    if (this.clusterState === undefined) {
      return Error("You have to fetch cluster state at first");
    }
    let nodesNames: string[] = [];
    let workerNodes = this.clusterState.workerNodes;
    for (let node of workerNodes) {
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        return Error("Node does not contain name");
      }
      nodesNames.push(nodeName);
    }
    Loggers.base.silly("[BaseProvider] Found " + nodesNames.length.toString() + ' worker nodes\' names');
    return nodesNames;
  }

  /**
   * Gets number of worker nodes.
   */
  public getNumNodeWorkers(): number | Error {
    if (this.clusterState === undefined) {
      return Error("You have to fetch cluster state at first");
    }
    let numWorkers = this.clusterState.workerNodes.length;
    return numWorkers;
  }
}

export default BaseProvider;
