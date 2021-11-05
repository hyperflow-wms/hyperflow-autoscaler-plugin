import { getBaseLogger } from '../utils/logger';

import k8s = require('@kubernetes/client-node');

const Logger = getBaseLogger();

class Client {
  static readonly hfMasterLabel = 'node-role.hyperflow.local/master';
  static readonly hfWorkerLabel = 'node-role.hyperflow.local/worker';

  private coreApi: k8s.CoreV1Api;

  constructor() {
    Logger.trace('[Client] Constructor');
    const kubeConfig = new k8s.KubeConfig();
    kubeConfig.loadFromDefault();

    this.coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Fetch all nodes.
   */
  public async fetchNodes(): Promise<k8s.V1Node[]> {
    Logger.verbose('[Client] Fetching nodes');
    const response = await this.coreApi.listNode();
    const nodeList = response.body.items;
    Logger.debug('[Client] Fetched ' + nodeList.length.toString() + ' nodes');
    return nodeList;
  }

  /**
   * Fetch all pods in given namespace.
   */
  public async fetchPods(namespace = 'default'): Promise<k8s.V1Pod[]> {
    Logger.verbose('[Client] Fetching pods for namespace ' + namespace);
    const response = await this.coreApi.listNamespacedPod('default');
    const podList = response.body.items;
    Logger.debug('[Client] Fetched ' + podList.length.toString() + ' pods');

    return podList;
  }

  /**
   * Returns worker view of nodes and pods:
   *  - nodes containing hyperflow-worker label
   *  - pods placed on nodes with hyperflow-worker label
   */
  public filterHFWorkerNodes(
    nodes: Array<k8s.V1Node>,
    pods: Array<k8s.V1Pod>
  ): [k8s.V1Node[], k8s.V1Pod[]] {
    /* Filtering nodes. */
    const workerNodes: Array<k8s.V1Node> = [];
    const workerNodesNames: Array<string> = [];
    for (const node of nodes) {
      const labels = node?.metadata?.labels;
      if (labels == undefined) {
        throw Error('Node does not contain labels');
      }
      const nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        throw Error('Node does not contain name');
      }
      const workerLabel = labels[Client.hfWorkerLabel];
      if (workerLabel === undefined) {
        Logger.trace(
          '[Client] Skipping node ' + nodeName + ' (no worker label)'
        );
        continue;
      }
      workerNodes.push(node);
      workerNodesNames.push(nodeName);
    }

    /* Filtering pods.
     * All pods on HF workers are included, plus pending pods.
     * Completed and failed pods are excluded.
     * Pending pods might be restricted with custom job label. */
    const podsOnWorkers: Array<k8s.V1Pod> = [];
    for (const pod of pods) {
      const podName = pod?.metadata?.name;
      if (podName == undefined) {
        throw Error('Pod does not contain name');
      }
      const nodeName = pod?.spec?.nodeName;
      if (nodeName !== undefined) {
        if (workerNodesNames.includes(nodeName) === false) {
          Logger.trace(
            '[Client] Skipping pod ' +
              podName +
              ' that is NOT placed on worker node'
          );
          continue;
        }
      }

      /* Skip pods that don't have required label - if specified. */
      if (nodeName === undefined) {
        const jobLabel = process.env['HF_VAR_autoscalerJobLabel'];
        if (jobLabel !== undefined) {
          const labels = pod?.metadata?.labels;
          if (labels === undefined) {
            Logger.trace(
              '[Client] Skipping pod ' +
                podName +
                ' - it has no labels, neither required ' +
                jobLabel
            );
            continue;
          }
          if (labels[jobLabel] === undefined) {
            Logger.trace(
              '[Client] Skipping pod ' +
                podName +
                ' - it has NOT required label ' +
                jobLabel
            );
            continue;
          }
        }
      }

      /* Skip completed and failed pods. */
      const phase = pod?.status?.phase;
      if (phase === 'Succeeded' || phase === 'Failed') {
        Logger.trace(
          '[Client] Skipping pod ' + podName + ' - in phase ' + phase
        );
        continue;
      }

      podsOnWorkers.push(pod);
    }

    Logger.debug(
      '[Client] Filtered out ' +
        workerNodes.length.toString() +
        ' hyperflow worker nodes and ' +
        podsOnWorkers.length.toString() +
        ' total pods on them'
    );
    return [workerNodes, podsOnWorkers];
  }
}

export default Client;
