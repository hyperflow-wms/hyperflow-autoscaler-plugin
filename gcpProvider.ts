import BaseProvider from './baseProvider';
import Loggers from './logger';
import Utils from "./utils";

class GCPProvider extends BaseProvider {
  constructor()
  {
    super();
    Loggers.base.silly("[GCPProvider] Constructor");
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void | Error> {
    return;
  }

  public resizeCluster(workersNum) {
    Loggers.base.silly("[GCPProvider] Resizing cluster to " + workersNum);
    //TODO see: https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.zones.clusters.nodePools/setSize#examples
    return Error("Not implemented yet");
  }
}

export default GCPProvider;
