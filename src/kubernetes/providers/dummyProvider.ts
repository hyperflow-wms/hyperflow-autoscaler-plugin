import BaseProvider from './baseProvider';

import { getBaseLogger } from '../../utils/logger';

const Logger = getBaseLogger();

class DummyProvider extends BaseProvider {
  constructor() {
    super();
    Logger.trace('[DummyProvider] Constructor');
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void> {
    Logger.debug('[DummyProvider] Initialization mock');
    return;
  }

  /**
   * Resizes cluster to given amount of nodes.
   */
  public async resizeCluster(workersNum: number): Promise<void> {
    Logger.debug(
      '[DummyProvider] Resizing cluster mock ' + workersNum.toString()
    );
    return;
  }
}

export default DummyProvider;
