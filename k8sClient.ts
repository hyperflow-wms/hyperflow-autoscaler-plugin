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
   * Fetch nodes that serves as hyperflow worker.
   */
  public async fetchWorkerNodes(): Promise<k8s.V1Node[] | Error> {
    Loggers.base.verbose('[K8sClient] Fetching nodes');
    let response = await this.coreApi.listNode();
    let nodeList = response.body.items;
    Loggers.base.debug('[K8sClient] Fetched ' + nodeList.length.toString() + ' nodes');

    let workerNodes: Array<k8s.V1Node> = [];
    for (let node of nodeList) {
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
        Loggers.base.debug('[K8sClient] Skipping node ' + nodeName + '(no worker label)');
        continue;
      }
      workerNodes.push(node);
    }
    Loggers.base.debug('[K8sClient] Found ' + workerNodes.length.toString() + ' hyperflow workers');
    return workerNodes;
  }

  /**
   * Fetch all pods in given namespace.
   */
  public async fetchWorkerPods(namespace: string = 'default') {
    Loggers.base.verbose('[K8sClient] Fetching pods for namespace ' + namespace);
    let response = await this.coreApi.listNamespacedPod('default');
    let podList = response.body.items;
    Loggers.base.debug('[K8sClient] Fetched ' + podList.length.toString() + '  podes');

    return podList;
  }
}

export default K8sClient;
