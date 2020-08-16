import Loggers from './logger';

import k8s = require('@kubernetes/client-node');

class K8sClient
{
  static readonly hfMasterLabel = 'node-role.hyperflow.local/master'
  static readonly hfWorkerLabel = 'node-role.hyperflow.local/worker'

  private coreApi: k8s.CoreV1Api;

  constructor()
  {
    Loggers.base.silly('[K8sClient] Constructor');
    let kubeConfig = new k8s.KubeConfig();
    kubeConfig.loadFromDefault();

    this.coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Fetch all nodes.
   */
  public async fetchNodes(): Promise<k8s.V1Node[] | Error> {
    Loggers.base.verbose('[K8sClient] Fetching nodes');
    let response = await this.coreApi.listNode();
    let nodeList = response.body.items;
    Loggers.base.debug('[K8sClient] Fetched ' + nodeList.length.toString() + ' nodes');
    return nodeList;
  }

  /**
   * Fetch all pods in given namespace.
   */
  public async fetchPods(namespace: string = 'default') {
    Loggers.base.verbose('[K8sClient] Fetching pods for namespace ' + namespace);
    let response = await this.coreApi.listNamespacedPod('default');
    let podList = response.body.items;
    Loggers.base.debug('[K8sClient] Fetched ' + podList.length.toString() + ' pods');

    return podList;
  }

  /**
   * Returns worker view of nodes and pods:
   *  - nodes containing hyperflow-worker label
   *  - pods placed on nodes with hyperflow-worker label
   */
  public filterHFWorkerNodes(nodes: Array<k8s.V1Node>, pods: Array<k8s.V1Pod>): Error | [k8s.V1Node[], k8s.V1Pod[]] {
    /* Filtering nodes. */
    let workerNodes: Array<k8s.V1Node> = [];
    let workerNodesNames: Array<string> = [];
    for (let node of nodes) {
      let labels = node?.metadata?.labels;
      if (labels == undefined) {
        return Error("Node does not contain labels");
      }
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        return Error("Node does not contain name");
      }
      let workerLabel = labels[K8sClient.hfWorkerLabel];
      if (workerLabel === undefined) {
        Loggers.base.silly('[K8sClient] Skipping node ' + nodeName + ' (no worker label)');
        continue;
      }
      workerNodes.push(node);
      workerNodesNames.push(nodeName);
    }

    /* Filtering pods. */
    let podsOnWorkers: Array<k8s.V1Pod> = [];
    for (let pod of pods) {
      let podName = pod?.metadata?.name;
      if (podName == undefined) {
        return Error("Pod does not contain name");
      }
      let nodeName = pod?.spec?.nodeName;
      if (nodeName == undefined) {
        return Error("Unable to get spec.nodeName from pod");
      }
      if (workerNodesNames.includes(nodeName) === false) {
        Loggers.base.silly("[K8sClient] Skipping pod " + podName + " that is NOT placed on worker node");
        continue;
      }
      podsOnWorkers.push(pod);
    }

    Loggers.base.debug('[K8sClient] Filtered out ' + workerNodes.length.toString() + ' hyperflow worker nodes and '
      + podsOnWorkers.length.toString() + ' total pods on them');
    return [workerNodes, podsOnWorkers];
  }
}

export default K8sClient;
