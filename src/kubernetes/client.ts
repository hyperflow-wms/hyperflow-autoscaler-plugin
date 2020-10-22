import { getBaseLogger } from '../utils/logger';

import k8s = require('@kubernetes/client-node');

const Logger = getBaseLogger();

class Client
{
  static readonly hfMasterLabel = 'node-role.hyperflow.local/master'
  static readonly hfWorkerLabel = 'node-role.hyperflow.local/worker'

  private coreApi: k8s.CoreV1Api;

  constructor()
  {
    Logger.silly('[Client] Constructor');
    let kubeConfig = new k8s.KubeConfig();
    kubeConfig.loadFromDefault();

    this.coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Fetch all nodes.
   */
  public async fetchNodes(): Promise<k8s.V1Node[]> {
    Logger.verbose('[Client] Fetching nodes');
    let response = await this.coreApi.listNode();
    let nodeList = response.body.items;
    Logger.debug('[Client] Fetched ' + nodeList.length.toString() + ' nodes');
    return nodeList;
  }

  /**
   * Fetch all pods in given namespace.
   */
  public async fetchPods(namespace: string = 'default') {
    Logger.verbose('[Client] Fetching pods for namespace ' + namespace);
    let response = await this.coreApi.listNamespacedPod('default');
    let podList = response.body.items;
    Logger.debug('[Client] Fetched ' + podList.length.toString() + ' pods');

    return podList;
  }

  /**
   * Returns worker view of nodes and pods:
   *  - nodes containing hyperflow-worker label
   *  - pods placed on nodes with hyperflow-worker label
   */
  public filterHFWorkerNodes(nodes: Array<k8s.V1Node>, pods: Array<k8s.V1Pod>): [k8s.V1Node[], k8s.V1Pod[]] {
    /* Filtering nodes. */
    let workerNodes: Array<k8s.V1Node> = [];
    let workerNodesNames: Array<string> = [];
    for (let node of nodes) {
      let labels = node?.metadata?.labels;
      if (labels == undefined) {
        throw Error("Node does not contain labels");
      }
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        throw Error("Node does not contain name");
      }
      let workerLabel = labels[Client.hfWorkerLabel];
      if (workerLabel === undefined) {
        Logger.silly('[Client] Skipping node ' + nodeName + ' (no worker label)');
        continue;
      }
      workerNodes.push(node);
      workerNodesNames.push(nodeName);
    }

    /* Filtering pods.
     * All pods on HF workers are included, plus pending pods.
     * Pending pods might be restricted with custom job label. */
    let podsOnWorkers: Array<k8s.V1Pod> = [];
    for (let pod of pods) {
      let podName = pod?.metadata?.name;
      if (podName == undefined) {
        throw Error("Pod does not contain name");
      }
      let nodeName = pod?.spec?.nodeName;
      if (nodeName !== undefined) {
        if (workerNodesNames.includes(nodeName) === false) {
          Logger.silly("[Client] Skipping pod " + podName + " that is NOT placed on worker node");
          continue;
        }
      }

      /* Skip pods that don't have required label - if specified. */
      if (nodeName === undefined) {
        let jobLabel = process.env['HF_VAR_autoscalerJobLabel'];
        if (jobLabel !== undefined) {
          let labels = pod?.metadata?.labels;
          if (labels === undefined) {
            Logger.silly("[Client] Skipping pod " + podName + " - it has no labels, neither required " + jobLabel);
            continue;
          }
          if (labels[jobLabel] === undefined) {
            Logger.silly("[Client] Skipping pod " + podName + " - it has NOT required label " + jobLabel);
            continue;
          }
        }
      }

      podsOnWorkers.push(pod);
    }

    Logger.debug('[Client] Filtered out ' + workerNodes.length.toString() + ' hyperflow worker nodes and '
      + podsOnWorkers.length.toString() + ' total pods on them');
    return [workerNodes, podsOnWorkers];
  }
}

export default Client;
