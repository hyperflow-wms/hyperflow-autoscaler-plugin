import Loggers from './logger';
import BaseProvider from './baseProvider';
import KindProvider from './kindProvider';
import GCPProvider from './gcpProvider';
import RPCChild from "./rpcChild";
import withTimeout from './helpers'

const REACT_INTERVAL = 10000;
const SCALE_UP_UTILIZATION = 0.9;
const SCALE_DOWN_UTILIZATION = 0.5;

class Engine {

  private provider: BaseProvider;
  private rpc: RPCChild;

  constructor() {
    this.provider =
      new KindProvider();
      //new GCPProvider();
    this.rpc = new RPCChild(this);
  }

  public async run(): Promise<void> {
    this.rpc.init();
    this.rpc.call('test', [], (data) => { console.log('Got RPC response: ', data); });
    await this.provider.initialize();

    this.reactLoop();
  }

  private async reactLoop(): Promise<void | Error> {
    Loggers.base.verbose("[Engine] React loop started");
    await withTimeout(this.provider.updateClusterState, 10000)();
    Loggers.base.verbose("[Engine] Cluster state updated");

    let numWorkers = this.provider.getNumNodeWorkers();
    if (numWorkers instanceof Error) {
      return Error("Unable to get number of workers: " + numWorkers.message);
    }
    let supply = this.provider.getSupply();
    let demand = this.provider.getDemand();

    Loggers.base.verbose('[Engine] Worker Nodes: ' + numWorkers);
    Loggers.base.verbose('[Engine] Demand: ' + demand);
    Loggers.base.verbose('[Engine] Supply: ' + supply);

    if ((demand[0] / supply[0]) > SCALE_UP_UTILIZATION) {
      Loggers.base.info("[Engine] Scaling up - not enough CPU");
      this.provider.resizeCluster(numWorkers + 1);
    } else if ((demand[1] / supply[1]) > SCALE_UP_UTILIZATION) {
      Loggers.base.info("[Engine] Scaling up - not enough RAM");
      this.provider.resizeCluster(numWorkers + 1);
    } else if ((demand[0] / supply[0]) < SCALE_DOWN_UTILIZATION && (demand[1] / supply[1]) < SCALE_DOWN_UTILIZATION && numWorkers > 0) {
      Loggers.base.info("[Engine] Scaling down - too much CPU & RAM");
      this.provider.resizeCluster(numWorkers - 1);
    } else {
      Loggers.base.info("[Engine] No action necessary");
    }

    setTimeout(() => { this.reactLoop(); }, REACT_INTERVAL);

    return;
  }
}

let engine = new Engine();
engine.run();
