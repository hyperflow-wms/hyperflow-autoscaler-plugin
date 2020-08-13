import BaseProvider from './baseProvider';
import Loggers from './logger';
import Utils from "./utils";

class GCPProvider extends BaseProvider {
  constructor()
  {
    super();
    Loggers.base.silly("[GCPProvider] Constructor");
  }

  public resizeCluster(workersNum) {
    Loggers.base.silly("[GCPProvider] Resizing cluster to " + workersNum);
    return Error("Not implemented yet");
  }
}

export default GCPProvider;
