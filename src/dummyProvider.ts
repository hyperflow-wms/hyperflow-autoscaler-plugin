import Loggers from './logger';
import BaseProvider from './baseProvider';

class DummyProvider extends BaseProvider {

  constructor()
  {
    super();
    Loggers.base.silly("[DummyProvider] Constructor");
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void | Error> {
    Loggers.base.debug("[DummyProvider] Initialization mock");
    return;
  }

  /**
   * Resizes cluster to given amount of nodes.
   */
  public async resizeCluster(workersNum: number) {
    Loggers.base.debug("[DummyProvider] Resizing cluster mock");

    return;
  }

  public async updateClusterState(): Promise<void | Error> {
    Loggers.base.debug("[DummyProvider] Updating cluster mock");
    return;
  }
}

export default DummyProvider;

