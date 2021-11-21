/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getBaseLogger } from '@hyperflow/logger';
import Client from '../../kubernetes/client';
import ResourceRequirements from '../../kubernetes/resourceRequirements';

import k8s = require('@kubernetes/client-node');

const Logger = getBaseLogger();

type timestamp = number;

interface ClusterState {
  lastUpdateTime: timestamp;
  workerNodes: k8s.V1Node[];
  pods: k8s.V1Pod[];
}
abstract class BaseProvider {
  protected client: Client;
  protected clusterState: ClusterState;

  constructor() {
    Logger.trace('[BaseProvider] Constructor');
    this.client = new Client();
  }

  public abstract initialize(): Promise<void>;

  public abstract resizeCluster(nodes: number): Promise<void>;

  protected filterClusterState(
    nodes: Array<k8s.V1Node>,
    pods: Array<k8s.V1Pod>
  ): [k8s.V1Node[], k8s.V1Pod[]] {
    return this.client.filterHFWorkerNodesAndPods(nodes, pods);
  }

  /**
   * Saves cluster state into internal structure.
   */
  public async updateClusterState(): Promise<void> {
    Logger.info('[BaseProvider] Updating cluster state');
    const currentTime = new Date().getTime();
    const promise1 = this.client.fetchNodes();
    const promise2 = this.client.fetchPods();
    const [nodes, pods] = await Promise.all([promise1, promise2]);
    let hfView: [k8s.V1Node[], k8s.V1Pod[]];
    try {
      hfView = this.filterClusterState(nodes, pods);
    } catch (err) {
      throw Error('Unable to get hyperflow view on cluster: ' + err.message);
    }
    this.clusterState = {
      lastUpdateTime: currentTime,
      workerNodes: hfView[0],
      pods: hfView[1]
    };
    Logger.info('[BaseProvider] Cluster state updated');

    return;
  }

  /**
   * Gets CPU/Memory supply of last-known cluster state.
   */
  public getSupply(): ResourceRequirements {
    if (this.clusterState === undefined) {
      throw Error('You have to fetch cluster state at first');
    }

    const nodes = this.clusterState.workerNodes;
    const resArr = nodes.map((node) => {
      const cpu = this.getNodeCpu(node);
      const memory = this.getNodeMemory(node);
      const nodeName = node?.metadata?.name;
      if (nodeName === undefined) {
        throw Error('Unable to get metadata.name from node');
      }
      Logger.debug(
        '[BaseProvider] Extracted details of node ' +
          nodeName +
          ': vCPU=' +
          cpu +
          ', RAM=' +
          memory
      );
      return new ResourceRequirements({ cpu: cpu, mem: memory });
    });

    const resSum = ResourceRequirements.Utils.getSum(resArr);
    Logger.debug(
      '[BaseProvider] Total supply of ' +
        nodes.length.toString() +
        ' nodes: vCPU=' +
        resSum.getCpuMillis() +
        'm, RAM=' +
        resSum.getMemBytes() +
        'B'
    );

    return resSum;
  }

  /**
   * Gets CPU/Memory demand of last-known cluster pods.
   */
  public getDemand(): ResourceRequirements {
    if (this.clusterState === undefined) {
      throw Error('You have to fetch cluster state at first');
    }

    const pods = this.clusterState.pods;
    const resArr = pods
      .flatMap((pod) => {
        const containers = pod?.spec?.containers;
        if (containers === undefined) {
          throw Error('Unable to get spec.containers from pod');
        }
        return containers;
      })
      .filter((container) => {
        const requests = container?.resources?.requests;
        const containerName = container.name;
        if (requests === undefined) {
          Logger.warn(
            `Unable to get resources.requests from container ${containerName}`
          );
          return false;
        } else if (requests?.cpu === undefined) {
          Logger.warn(
            `Container ${containerName} requests does not have cpu details`
          );
          return false;
        } else if (requests?.memory === undefined) {
          Logger.warn(
            `Container ${containerName} requests does not have memory details`
          );
          return false;
        } else return true;
      })
      .map((container) => {
        const requests = container.resources!.requests!;
        const cpu = requests.cpu!;
        const memory = requests.memory!;
        Logger.debug(
          '[BaseProvider] Extracted details of container demand: vCPU=' +
            cpu +
            ', RAM=' +
            memory
        );

        return new ResourceRequirements({ cpu: cpu, mem: memory });
      });

    const resSum = ResourceRequirements.Utils.getSum(resArr);
    Logger.debug(
      '[BaseProvider] Total demand of ' +
        pods.length.toString() +
        ' pods: vCPU=' +
        resSum.getCpuMillis() +
        'm, RAM=' +
        resSum.getMemBytes() +
        'B'
    );

    return resSum;
  }

  /**
   * Extracts allocatable CPU from node item.
   */
  protected getNodeCpu(node: k8s.V1Node): string {
    // NOTE: allocatable = capacity - reserved
    const allocatable = node?.status?.allocatable;
    if (allocatable === undefined) {
      throw Error('Node has no status.allocatable details');
    }
    const cpu = allocatable.cpu;
    return cpu;
  }

  /**
   * Extracts allocatable memory from node item.
   */
  protected getNodeMemory(node: k8s.V1Node): string {
    // NOTE: allocatable = capacity - reserved
    const allocatable = node?.status?.allocatable;
    if (allocatable === undefined) {
      throw Error('Node has no status.allocatable details');
    }
    const memory = allocatable.memory;
    return memory;
  }

  /**
   * Gets list of worker nodes' names.
   */
  public getWorkerNodesNames(): string[] {
    if (this.clusterState === undefined) {
      throw Error('You have to fetch cluster state at first');
    }
    const workerNodes = this.clusterState.workerNodes;
    const nodesNames = workerNodes.map((node) => {
      const nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        throw Error('Node does not contain name');
      }
      return nodeName;
    });
    Logger.trace(
      '[BaseProvider] Found ' +
        nodesNames.length.toString() +
        " worker nodes' names"
    );
    return nodesNames;
  }

  /**
   * Gets number of worker nodes.
   */
  public getNumNodeWorkers(): number {
    if (this.clusterState === undefined) {
      throw Error('You have to fetch cluster state at first');
    }
    const numWorkers = this.clusterState.workerNodes.length;
    return numWorkers;
  }
}

export default BaseProvider;
