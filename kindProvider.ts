import Loggers from './logger';
import BaseProvider from './baseProvider';

import k8s = require('@kubernetes/client-node');

const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

class KindProvider extends BaseProvider {

  private drainedNodeNames: Set<string>;

  constructor()
  {
    super();
    Loggers.base.silly("[KindProvider] Constructor");
    this.drainedNodeNames = new Set();
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void | Error> {
    Loggers.base.debug("[KindProvider] Initialization");
    return;
  }

  /**
   * In KinD we additionally filter out nodes that are drained (unschedulable).
   */
  protected filterClusterState(nodes: Array<k8s.V1Node>, pods: Array<k8s.V1Pod>) {
    /* Filter unschedulable nodes. */
    Loggers.base.debug("[KindProvider] Custom nodes filtering");
    let uncordonedNodes: Array<k8s.V1Node> = [];
    for (let node of nodes) {
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        return Error("Unable to get metadata.name from node");
      }
      let nodeSpec = node?.spec;
      if (nodeSpec == undefined) {
        return Error("Unable to get spec from node");
      }
      let unschedulableProp = nodeSpec.unschedulable;
      if (unschedulableProp == true) {
        Loggers.base.debug("[KindProvider] Unschedulable node " + nodeName);
        this.drainedNodeNames.add(nodeName);
        continue;
      }
      uncordonedNodes.push(node);
    }
    return super.filterClusterState(uncordonedNodes, pods);
  }

  /**
   * Resizes cluster to given amount of nodes.
   */
  public async resizeCluster(workersNum: number) {
    Loggers.base.debug("[KindProvider] Resizing cluster to " + workersNum.toString() + " workers");
    if (this.clusterState === undefined) {
      return Error("You have to fetch cluster state at first");
    }

    if (workersNum < 0) {
      Loggers.base.error("Cluster size cannot be smaller than 0 worker.");
      return Error("Cluster size cannot be smaller than 0 worker");
    }

    let workerNodesNames = this.getWorkerNodesNames();
    if (workerNodesNames instanceof Error) {
      return Error("Unable to get worker node names: " + workerNodesNames.message);
    }
    let currentSize = workerNodesNames.length;
    let availableNodes = this.drainedNodeNames.size;
    if (workersNum > (currentSize + availableNodes)) {
      return Error("Too much workers requested.");
    }

    if (currentSize == workersNum) {
      // perfect num of nodes
      Loggers.base.debug("[KindProvider] No action necessary.");
    } else if (currentSize < workersNum) {
      // add more nodes
      let cordonPromises: Promise<void | Error>[] = [];
      let missingNodes = workersNum - currentSize;
      this.drainedNodeNames.forEach(function(nodeName) {
        if (missingNodes > 0) {
          let cordonPromise = this.uncordonNode(nodeName);
          cordonPromises.push(cordonPromise);
          missingNodes -= 1;
        }
      }, this);
      let cordonResult = await Promise.all(cordonPromises).catch((err) => { return Error("Unable to cordon: " + err.toString()) });
      if (cordonResult instanceof Error) {
        Loggers.base.error("[KindProvider] Error: " + cordonResult.message);
      }
    } else {
      // remove nodes
      let drainPromises: Promise<void | Error>[] = [];
      let overNodes = workerNodesNames.slice(workersNum - currentSize);
      for (let nodeName of overNodes) {
        let drainPromise = this.drainNode(nodeName);
        drainPromises.push(drainPromise);
      }
      let drainResult = await Promise.all(drainPromises).catch((err) => { return Error("Unable to drain: " + err.toString()) });
      if (drainResult instanceof Error) {
        Loggers.base.error("[KindProvider] Error: " + drainResult.message);
      }
    }
    Loggers.base.debug("[KindProvider] Cluster resized to " + workersNum + " workers.");

    return;
  }

  /**
   * Uncordons node.
   */
  private async uncordonNode(nodeName: string): Promise<void | Error> {
    if (this.drainedNodeNames.has(nodeName) === false) {
      return Error("Node " + nodeName + " is not recognized as drained one.");
    }

    let cmd = 'kubectl';
    let args = ['uncordon', nodeName];
    Loggers.base.debug("[KindProvider] Executing " + cmd + " with following args: " + args.join(' '));
    Loggers.scaling.info('{"event":"creatingNode", "value":"' + nodeName + '"}');
    const { stdout, stderr } = await execFile(cmd, args); // exitCode is 0, otherwise exception is thrown
    Loggers.scaling.info('{"event":"nodeReady", "value":"' + nodeName + '"}');
    Loggers.base.debug("[KindProvider] drain stdout: " + stdout);
    Loggers.base.debug("[KindProvider] drain stderr: " + stderr);

    this.drainedNodeNames.delete(nodeName);
    return;
  }

  /**
   * Drains node.
   */
  private async drainNode(nodeName: string): Promise<void | Error> {

    if (this.drainedNodeNames.has(nodeName) === true) {
      return Error("Node " + nodeName + " is already recognized as drained.");
    }

    let cmd = 'kubectl';
    let args = ['drain', '--ignore-daemonsets', nodeName];
    Loggers.base.debug("[KindProvider] Executing " + cmd + " with following args: " + args.join(' '));
    Loggers.scaling.info('{"event":"destroyingNode", "value":"' + nodeName + '"}');
    const { stdout, stderr } = await execFile(cmd, args); // exitCode is 0, otherwise exception is thrown
    Loggers.scaling.info('{"event":"nodeDeleted", "value":"' + nodeName + '"}');
    Loggers.base.debug("[KindProvider] drain stdout: " + stdout);
    Loggers.base.debug("[KindProvider] drain stderr: " + stderr);

    this.drainedNodeNames.add(nodeName);
    return;
  }
}

export default KindProvider;

