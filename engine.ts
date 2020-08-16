#!/usr/bin/env node
import Loggers from './logger';
import BaseProvider from './baseProvider';
import CooldownTracker from './cooldownTracker';
import KindProvider from './kindProvider';
import GCPProvider from './gcpProvider';
import RPCChild from "./rpcChild";
import withTimeout from './helpers'

const REACT_INTERVAL = 10000;
const SCALE_UP_UTILIZATION = 0.9;
const SCALE_DOWN_UTILIZATION = 0.5;

const SCALE_UP_COOLDOWN_S = 3 * 60;
const SCALE_DOWN_COOLDOWN_S = 3 * 60;

class Engine {

  private provider: BaseProvider;
  private rpc: RPCChild;
  private scaleUpCooldown: CooldownTracker;
  private scaleDownCooldown: CooldownTracker;

  constructor(providerName: string) {
    Loggers.base.info("[Engine] Trying to create provider " + providerName);
    if (providerName == "gcp") {
      this.provider = new GCPProvider();
    } else if (providerName == "kind") {
      this.provider = new KindProvider();
    }
    if (this.provider === undefined) {
      throw Error("Provider " + providerName + " not found!");
    }
    this.scaleUpCooldown = new CooldownTracker();
    this.scaleDownCooldown = new CooldownTracker();
    this.rpc = new RPCChild(this);
  }

  public async run(): Promise<void> {
    this.rpc.init();
    //this.rpc.call('test', [], (data) => { console.log('Got RPC response: ', data); });
    await this.provider.initialize();

    this.reactLoop();
  }

  private async reactLoop(): Promise<void | Error> {
    Loggers.base.verbose("[Engine] React loop started");
    await this.provider.updateClusterState();
    Loggers.base.verbose("[Engine] Cluster state updated");

    let numWorkers = this.provider.getNumNodeWorkers();
    if (numWorkers instanceof Error) {
      return Error("Unable to get number of workers: " + numWorkers.message);
    }
    let supply = this.provider.getSupply();
    let demand = this.provider.getDemand();

    Loggers.base.verbose('[Engine] Number of HyperFlow workers: ' + numWorkers);
    Loggers.base.verbose('[Engine] Demand: ' + demand);
    Loggers.base.verbose('[Engine] Supply: ' + supply);

    if ((demand[0] / supply[0]) > SCALE_UP_UTILIZATION) {
      if (this.scaleUpCooldown.isExpired() === false) {
        Loggers.base.info("[Engine] Not enough CPU - not scaling due to up-cooldown");
      } else {
        Loggers.base.info("[Engine] Scaling up - not enough CPU");
        this.provider.resizeCluster(numWorkers + 1);
        this.scaleUpCooldown.setNSeconds(SCALE_UP_COOLDOWN_S);
      }
    } else if ((demand[1] / supply[1]) > SCALE_UP_UTILIZATION) {
      if (this.scaleUpCooldown.isExpired() === false) {
        Loggers.base.info("[Engine] Not enough RAM - not scaling due to up-cooldown");
      } else {
        Loggers.base.info("[Engine] Scaling up - not enough RAM");
        this.provider.resizeCluster(numWorkers + 1);
        this.scaleUpCooldown.setNSeconds(SCALE_UP_COOLDOWN_S);
      }
    } else if ((demand[0] / supply[0]) < SCALE_DOWN_UTILIZATION && (demand[1] / supply[1]) < SCALE_DOWN_UTILIZATION && numWorkers > 0) {
      if (this.scaleDownCooldown.isExpired() === false) {
        Loggers.base.info("[Engine] Too much CPU & RAM - not scaling due to down-cooldown");
      } else {
        Loggers.base.info("[Engine] Scaling down - too much CPU & RAM");
        this.provider.resizeCluster(numWorkers - 1);
        this.scaleDownCooldown.setNSeconds(SCALE_DOWN_COOLDOWN_S);
      }
    } else {
      Loggers.base.info("[Engine] No action necessary");
    }

    setTimeout(() => { this.reactLoop(); }, REACT_INTERVAL);

    return;
  }
}

var args = process.argv.slice(2);
if (args.length != 1) {
  throw Error("ERROR: 1 argument expected, got " + args.length.toString());
}
let providerName = args[0];
let engine = new Engine(providerName);
engine.run();
