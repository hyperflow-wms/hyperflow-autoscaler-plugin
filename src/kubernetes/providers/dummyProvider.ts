import BaseProvider from './baseProvider';

import { getBaseLogger } from '../../utils/logger';

const Logger = getBaseLogger();

class DummyProvider extends BaseProvider {

  constructor()
  {
    super();
    Logger.silly("[DummyProvider] Constructor");
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void> {
    Logger.debug("[DummyProvider] Initialization mock");
    return;
  }

  /**
   * Resizes cluster to given amount of nodes.
   */
  public async resizeCluster(workersNum: number) {
    Logger.debug("[DummyProvider] Resizing cluster mock");

    return;
  }

  public async updateClusterState(): Promise<void> {
    Logger.debug("[DummyProvider] Updating cluster mock");
    return;
  }
}

export default DummyProvider;

