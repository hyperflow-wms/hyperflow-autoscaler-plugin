import withTimeout from './helpers'
import Loggers from './logger';
import BaseProvider from './baseProvider';
import Utils from "./utils";

import * as child_process from 'child_process';
import { V1Node } from '@kubernetes/client-node';

const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

const FAKE_CPU_FACTOR = 0.25;


class KindProvider extends BaseProvider {
  private workerNodesNames: string[];
  private nFirstWorkerNodesReady: number;
  private initialized: boolean;

  constructor()
  {
    super();

    this.workerNodesNames = [];
    this.nFirstWorkerNodesReady = 0;
    this.initialized = false;
  }

  protected getNodeCpu(node) {
    let allocatable = node.status.allocatable; // allocatable = capacity - reserved
    let cpu = Utils.cpuStringToNum(allocatable.cpu);
    if (cpu instanceof Error) {
      return cpu;
    }
    // We are using quota/period to control cpu usage.
    // Event though we have LXCFS, we are not using cpusets, so every
    // node can see 12 cores. We have to use custom factor to simulate it.
    let fixedCpu = cpu * FAKE_CPU_FACTOR;
    return fixedCpu;
  }

  protected getNodeMemory(node) {
    // LXCFS makes this working (cgroups are taken)
    let allocatable = node.status.allocatable; // allocatable = capacity - reserved
    let memory = Utils.memoryStringToBytes(allocatable.memory);
    return memory;
  }

  public resizeCluster(workersNum) {
    if (this.initialized != true) {
      Loggers.base.error("You have to call initialize() first.");
      return Error("Provider not initialized");
    }

    if (workersNum > this.workerNodesNames.length) {
      Loggers.base.error("Too much workers requested.");
      return Error("Too much workers requested");
    }

    if (workersNum < 0) {
      Loggers.base.error("Cluster size cannot be smaller than 0 worker.");
      return Error("Cluster size cannot be smaller than 0 worker");
    }

    if (this.nFirstWorkerNodesReady == workersNum) {
      // perfect num of nodes
      Loggers.base.debug("No action necessary.");
    } else if (this.nFirstWorkerNodesReady < workersNum) {
      // add more nodes
      for (let i = this.nFirstWorkerNodesReady; i < workersNum; i++) {
        let nodeName = this.workerNodesNames[i];
        Loggers.base.debug("Uncordoning node.");
        Loggers.scaling.info('{"event":"creatingNode", "value":"' + nodeName + '"}');
        this.uncordonNode(nodeName);
        Loggers.scaling.info('{"event":"nodeReady", "value":"' + nodeName + '"}');
      }
    } else {
      // remove nodes
      for (let i = workersNum; i < this.nFirstWorkerNodesReady; i++) {
        let nodeName = this.workerNodesNames[i];
        Loggers.base.debug("Draining node.");
        Loggers.scaling.info('{"event":"destroyingNode", "value":"' + nodeName + '"}');
        this.drainNode(nodeName);
        Loggers.scaling.info('{"event":"nodeDeleted", "value":"' + nodeName + '"}');
      }
    }
    Loggers.base.debug("Cluster resized to " + workersNum + " workers.");

    return;
  }

  public getNumAllWorkers() {
    return this.workerNodesNames.length;
  }

  public getNumReadyWorkers() {
    return this.nFirstWorkerNodesReady;
  }

  public initializeCluster(): Promise<void | Error> {
    let promise = this.client.getWorkerNodes().then((nodeList) => {
      if (nodeList instanceof Error) {
        return nodeList;
      }
      for (let node of nodeList) {
        let name = node?.metadata?.name
        if (name == undefined) {
          return Error("Unable to get metadata.name from node");
        }
        this.workerNodesNames.push(name);
      }
      Loggers.base.debug('Found ' + this.workerNodesNames + 'workers')

      for (let i = 0; i < this.workerNodesNames.length; i++) {
        let nodeName = this.workerNodesNames[i];
        this.uncordonNode(nodeName); // we want to be sure every woker node is schedulable
      }

      this.initialized = true;
      Loggers.base.debug("Cluster intitialized");

      return;
    });
    return promise;
  }

  /**
   * Uncordons node.
   */
  private async uncordonNode(nodeName: string): Promise<void> {
    // TODO: check if nodeName is in clusterState
    let cmd = 'kubectl';
    let args = ['uncordon', nodeName];
    Loggers.base.debug("Executing " + cmd + " with following args: " + args.join(' '));
    const { stdout, stderr } = await execFile(cmd, args); // exitCode is 0, otherwise exception is thrown
    Loggers.base.debug("drain stdout: " + stdout);
    Loggers.base.debug("drain stderr: " + stderr);

    this.nFirstWorkerNodesReady += 1; // TODO: remove this line

    return;
  }

  /**
   * Drains node.
   */
  private async drainNode(nodeName: string): Promise<void> {
    // TODO: check if nodeName is in clusterState
    let cmd = 'kubectl';
    let args = ['drain', '--ignore-daemonsets', nodeName];
    Loggers.base.debug("Executing " + cmd + " with following args: " + args.join(' '));
    const { stdout, stderr } = await execFile(cmd, args); // exitCode is 0, otherwise exception is thrown
    Loggers.base.debug("drain stdout: " + stdout);
    Loggers.base.debug("drain stderr: " + stderr);

    this.nFirstWorkerNodesReady -= 1; // TODO: remove this line

    return;
  }
}

export default KindProvider;

