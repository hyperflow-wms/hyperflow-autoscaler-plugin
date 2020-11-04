import BaseProvider from './baseProvider';

import { getBaseLogger, scalingLogger } from '../../utils/logger';

import k8s = require('@kubernetes/client-node');

const Logger = getBaseLogger();
const ScalingLogger = scalingLogger;
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

class KindProvider extends BaseProvider {

  private drainedNodeNames: Set<string>;

  constructor()
  {
    super();
    Logger.silly("[KindProvider] Constructor");
    this.drainedNodeNames = new Set();
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void> {
    Logger.debug("[KindProvider] Initialization");
    return;
  }

  /**
   * In KinD we additionally filter out nodes that are drained (unschedulable).
   */
  protected filterClusterState(nodes: Array<k8s.V1Node>, pods: Array<k8s.V1Pod>) {
    /* Filter unschedulable nodes. */
    Logger.debug("[KindProvider] Custom nodes filtering");
    let uncordonedNodes: Array<k8s.V1Node> = [];
    for (let node of nodes) {
      let nodeName = node?.metadata?.name;
      if (nodeName == undefined) {
        throw Error("Unable to get metadata.name from node");
      }
      let nodeSpec = node?.spec;
      if (nodeSpec == undefined) {
        throw Error("Unable to get spec from node");
      }
      let unschedulableProp = nodeSpec.unschedulable;
      if (unschedulableProp == true) {
        Logger.debug("[KindProvider] Unschedulable node " + nodeName);
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
  public async resizeCluster(workersNum: number): Promise<void> {
    Logger.debug("[KindProvider] Resizing cluster to " + workersNum.toString() + " workers");
    if (this.clusterState === undefined) {
      throw Error("You have to fetch cluster state at first");
    }

    if (workersNum < 0) {
      Logger.error("Cluster size cannot be smaller than 0 worker.");
      throw Error("Cluster size cannot be smaller than 0 worker");
    }

    let workerNodesNames: string[];
    try {
      workerNodesNames = this.getWorkerNodesNames();
    } catch (err) {
      throw Error("Unable to get worker node names: " + err.message);
    }
    let currentSize = workerNodesNames.length;
    let availableNodes = this.drainedNodeNames.size;
    if (workersNum > (currentSize + availableNodes)) {
      throw Error("Too much workers requested.");
    }

    if (currentSize == workersNum) {
      // perfect num of nodes
      Logger.debug("[KindProvider] No action necessary.");
    } else if (currentSize < workersNum) {
      // add more nodes
      let cordonPromises: Promise<void>[] = [];
      let missingNodes = workersNum - currentSize;
      this.drainedNodeNames.forEach(function(nodeName) {
        if (missingNodes > 0) {
          let cordonPromise = this.uncordonNode(nodeName);
          cordonPromises.push(cordonPromise);
          missingNodes -= 1;
        }
      }, this);
      try {
        await Promise.all(cordonPromises).catch((err) => { throw Error("Unable to cordon: " + err.toString()) });
      } catch (err) {
        Logger.error("[KindProvider] Error: " + err.message);
      }
    } else {
      // remove nodes
      let drainPromises: Promise<void>[] = [];
      let overNodes = workerNodesNames.slice(workersNum - currentSize);
      for (let nodeName of overNodes) {
        let drainPromise = this.drainNode(nodeName);
        drainPromises.push(drainPromise);
      }
      try {
        await Promise.all(drainPromises).catch((err) => { throw Error("Unable to drain: " + err.toString()) });
      } catch (err) {
        Logger.error("[KindProvider] Error: " + err.message);
      }
    }
    Logger.debug("[KindProvider] Cluster resized to " + workersNum + " workers.");

    return;
  }

  /**
   * Uncordons node.
   */
  private async uncordonNode(nodeName: string): Promise<void> {
    if (this.drainedNodeNames.has(nodeName) === false) {
      throw Error("Node " + nodeName + " is not recognized as drained one.");
    }

    let cmd = 'kubectl';
    let args = ['uncordon', nodeName];
    Logger.debug("[KindProvider] Executing " + cmd + " with following args: " + args.join(' '));
    ScalingLogger.info('{"event":"creatingNode", "value":"' + nodeName + '"}');
    const { stdout, stderr } = await execFile(cmd, args); // exitCode is 0, otherwise exception is thrown
    ScalingLogger.info('{"event":"nodeReady", "value":"' + nodeName + '"}');
    Logger.debug("[KindProvider] drain stdout: " + stdout);
    Logger.debug("[KindProvider] drain stderr: " + stderr);

    this.drainedNodeNames.delete(nodeName);
    return;
  }

  /**
   * Drains node.
   */
  private async drainNode(nodeName: string): Promise<void> {

    if (this.drainedNodeNames.has(nodeName) === true) {
      throw Error("Node " + nodeName + " is already recognized as drained.");
    }

    let cmd = 'kubectl';
    let args = ['drain', '--ignore-daemonsets', nodeName];
    Logger.debug("[KindProvider] Executing " + cmd + " with following args: " + args.join(' '));
    ScalingLogger.info('{"event":"destroyingNode", "value":"' + nodeName + '"}');
    const { stdout, stderr } = await execFile(cmd, args); // exitCode is 0, otherwise exception is thrown
    ScalingLogger.info('{"event":"nodeDeleted", "value":"' + nodeName + '"}');
    Logger.debug("[KindProvider] drain stdout: " + stdout);
    Logger.debug("[KindProvider] drain stderr: " + stderr);

    this.drainedNodeNames.add(nodeName);
    return;
  }
}

export default KindProvider;

