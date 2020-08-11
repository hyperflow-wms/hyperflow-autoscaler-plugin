
import k8s = require('@kubernetes/client-node');

class K8sClient
{
  private coreApi: k8s.CoreV1Api;

  constructor()
  {
    let kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  public getWorkerNodes(): Promise<k8s.V1Node[] | Error> {
    let promise = this.coreApi.listNode().then((res) => {
      let workerNodes: Array<k8s.V1Node> = [];
      let items = res.body.items;
      for (let node of items) {
        let labels = node?.metadata?.labels;
        if (labels == undefined) {
          return Error("Node does not contain labels");
        }
        let masterLabel = labels['node-role.kubernetes.io/master'];
        let hfMasterLabel = labels['nodeType'];
        // skip cluster control-plane and worker designated for hyperflow stack
        if (masterLabel == undefined && hfMasterLabel == undefined) {
          continue;
        }
        workerNodes.push(node);
      }
      return workerNodes;
    });
    return promise;
  }

  public getPods(namespace: string = 'default')
  {
    let promise = this.coreApi.listNamespacedPod('default');
    return promise;
  }
}

export default K8sClient;
