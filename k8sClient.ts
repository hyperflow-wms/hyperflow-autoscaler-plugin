
import k8s = require('@kubernetes/client-node');

class K8sClient
{
  static readonly controlPlaneLabel = 'node-role.kubernetes.io/master';
  static readonly hfMasterLabel = 'node-role.hyperflow.local/master'

  private coreApi: k8s.CoreV1Api;

  constructor()
  {
    let kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  public async fetchWorkerNodes(): Promise<k8s.V1Node[] | Error> {
    let response = await this.coreApi.listNode();
    let nodeList = response.body.items;
    let workerNodes: Array<k8s.V1Node> = [];

    for (let node of nodeList) {
      let labels = node?.metadata?.labels;
      if (labels == undefined) {
        return Error("Node does not contain labels");
      }
      let masterLabel = labels[K8sClient.controlPlaneLabel];
      let hfMasterLabel = labels[K8sClient.hfMasterLabel];
      // skip cluster control-plane and worker designated for hyperflow stack
      if (masterLabel == undefined && hfMasterLabel == undefined) {
        continue;
      }
      workerNodes.push(node);
    }
    return workerNodes;
  }

  /**
   * Fetch all pods in given namespace.
   */
  public async fetchPods(namespace: string = 'default')
  {
    let response = await this.coreApi.listNamespacedPod('default');
    let podList = response.body.items;
    return podList;
  }
}

export default K8sClient;
