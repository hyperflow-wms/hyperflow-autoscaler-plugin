import { getBaseLogger } from '../../utils/logger';
import Client from '../../kubernetes/client';
import ResourceRequirements from "../../kubernetes/resourceRequirements";

import k8s = require('@kubernetes/client-node');

const Logger = getBaseLogger();

interface ClusterState {
  lastUpdate: Date;
  workerNodes: k8s.V1Node[];
  pods: k8s.V1Pod[];
}
abstract class BaseProvider {
  protected client: Client;
  protected clusterState: ClusterState;

  constructor() {
    Logger.silly("[BaseProvider] Constructor");
    this.client = new Client();
  }

  public abstract async initialize(): Promise<void>;

  public abstract async resizeCluster(nodes: number): Promise<void>;

  protected filterClusterState(nodes: Array<k8s.V1Node>, pods: Array<k8s.V1Pod>) {
    return this.client.filterHFWorkerNodes(nodes, pods);
  }

  /**
   * Saves cluster state into internal structure.
   */
  public async updateClusterState(): Promise<void> {
    Logger.info("[BaseProvider] Updating cluster state");
    let currentTime = new Date();
    let promise1 = this.client.fetchNodes();
    let promise2 = this.client.fetchPods();
    let nodes;
    let pods;
    [nodes, pods] = await Promise.all([promise1, promise2]);
    let hfView: [k8s.V1Node[], k8s.V1Pod[]];
    try {
      hfView = this.filterClusterState(nodes, pods);
    } catch (err) {
      throw Error("Unable to get hyperflow view on cluster: " + err.message);
    }
    this.clusterState = {
      lastUpdate: currentTime,
      workerNodes: hfView[0],
      pods: hfView[1],
    };
    Logger.info("[BaseProvider] Cluster state updated");

    return;
  }

  /**
   * Gets CPU/Memory supply of last-known cluster state.
   */
  public getSupply(): ResourceRequirements {
    if (this.clusterState === undefined) {
      throw Error("You have to fetch cluster state at first");
    }

    let nodes = this.clusterState.workerNodes;
    let resArr: ResourceRequirements[] = [];
    for (let node of nodes) {
      let cpu = this.getNodeCpu(node);
      let memory = this.getNodeMemory(node);
      let nodeName = node?.metadata?.name;
      if (nodeName === undefined) {
        throw Error("Unable to get metadata.name from node");
      }
      Logger.debug('[BaseProvider] Extracted details of node ' + nodeName + ': vCPU=' + cpu + ', RAM=' + memory);
      resArr.push(new ResourceRequirements({cpu: cpu, mem: memory}));
    }

    let resSum = ResourceRequirements.Utils.getSum(resArr);
    Logger.debug("[BaseProvider] Total supply of " + nodes.length.toString() + ' nodes: vCPU=' + resSum.getCpuMillis() + 'm, RAM=' + resSum.getMemBytes() + 'B');

    return resSum;
  }

  /**
   * Gets CPU/Memory demand of last-known cluster pods.
   */
  public getDemand(): ResourceRequirements {
    if (this.clusterState === undefined) {
      throw Error("You have to fetch cluster state at first");
    }

    let pods = this.clusterState.pods;
    let resArr: ResourceRequirements[] = [];
    for (let pod of pods) {
      let nodeName = pod?.spec?.nodeName;
      if (nodeName == undefined) {
        throw Error("Unable to get spec.nodeName from pod");
      }
      let containers = pod?.spec?.containers;
      if (containers == undefined) {
        throw Error("Unable to get spec.containers from pod");
      }
      for (let container of containers) {
        //let limits = container.resources.limits;
        let requests = container?.resources?.requests;
        if (requests === undefined) {
          throw Error("Unable to get resources.requests from container");
        }
        if (requests.cpu === undefined) {
          throw Error("Requests does not have cpu details");
        }
        if (requests.memory === undefined) {
          throw Error("Requests does not have memory details");
        }
        let cpu = requests.cpu;
        let memory = requests.memory;
        Logger.debug('[BaseProvider] Extracted details of container demand: vCPU=' + cpu + ', RAM=' + memory);

        resArr.push(new ResourceRequirements({cpu: cpu, mem: memory}));
      }
    }

    let resSum = ResourceRequirements.Utils.getSum(resArr);
    Logger.debug("[BaseProvider] Total demand of " + pods.length.toString() + ' pods: vCPU=' + resSum.getCpuMillis() + 'm, RAM=' + resSum.getMemBytes() + 'B');

    return resSum;
  }

  /**
   * Extracts allocatable CPU from node item.
   */
  protected getNodeCpu(node: k8s.V1Node): string {
    // NOTE: allocatable = capacity - reserved
    let allocatable = node?.status?.allocatable;
    if (allocatable === undefined) {
      throw Error("Node has no status.allocatable details");
    }
    let cpu = allocatable.cpu;
    return cpu;
  }

  /**
   * Extracts allocatable memory from node item.
   */
  protected getNodeMemory(node: k8s.V1Node): string {
    // NOTE: allocatable = capacity - reserved
    let allocatable = node?.status?.allocatable;
    if (allocatable === undefined) {
      throw Error("Node has no status.allocatable details");
    }
    let memory = allocatable.memory;
    return memory;
  }

  /**
   * Gets list of worker nodes' names.
   */
  public getWorkerNodesNames(): string[] {
    if (this.clusterState === undefined) {
      throw Error("You have to fetch cluster state at first");
    }
    let nodesNames: string[] = [];
    let workerNodes = this.clusterState.workerNodes;
    for (let node of workerNodes) {
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        throw Error("Node does not contain name");
      }
      nodesNames.push(nodeName);
    }
    Logger.silly("[BaseProvider] Found " + nodesNames.length.toString() + ' worker nodes\' names');
    return nodesNames;
  }

  /**
   * Gets number of worker nodes.
   */
  public getNumNodeWorkers(): number {
    if (this.clusterState === undefined) {
      throw Error("You have to fetch cluster state at first");
    }
    let numWorkers = this.clusterState.workerNodes.length;
    return numWorkers;
  }
}

export default BaseProvider;
