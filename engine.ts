import Loggers from './logger';
import KindProvider from './kindProvider';
import GCPProvider from './gcpProvider';
import RPCChild from "./rpcChild";
import BaseProvider from './baseProvider';

const REACT_INTERVAL = 5000;
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

  public run(): void {
    this.rpc.init();
    this.rpc.call('test', [], (data) => { console.log(data); });

    this.reactLoop();
  }

  private reactLoop(): void {
    console.log("[AB asc] React loop started");
    this.provider.getSupply().then((supply) => {
      this.provider.getDemand().then((demand) => {

        Loggers.base.info('Ready workers: ' + this.provider.getNumReadyWorkers()
                    + '/' + this.provider.getNumAllWorkers())
        Loggers.base.info('Demand: ' + demand);
        Loggers.base.info('Supply: ' + supply);

        let numWorkers = this.provider.getNumReadyWorkers();
        if (numWorkers instanceof Error) {
          console.error(numWorkers.message);
          return;
        }
        if ((demand[0] / supply[0]) > SCALE_UP_UTILIZATION) {
          Loggers.base.info("-> scale up (not enough CPU)");
          this.provider.resizeCluster(numWorkers + 1);
        } else if ((demand[1] / supply[1]) > SCALE_UP_UTILIZATION) {
          Loggers.base.info("-> scale up (not enough RAM)");
          this.provider.resizeCluster(numWorkers + 1);
        } else if ((demand[0] / supply[0]) < SCALE_DOWN_UTILIZATION && (demand[1] / supply[1]) < SCALE_DOWN_UTILIZATION && numWorkers > 0) {
          Loggers.base.info("-> scale down (too much CPU & RAM)\n");
          this.provider.resizeCluster(numWorkers - 1);
        } else {
          Loggers.base.info("-> cluster is fine :)\n");
        }

        setTimeout(() => { this.reactLoop(); }, REACT_INTERVAL);
      });
    });
  }
}

let engine = new Engine();
engine.run();
