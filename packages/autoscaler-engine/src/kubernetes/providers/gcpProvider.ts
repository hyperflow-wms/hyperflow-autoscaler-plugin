import BaseProvider from './baseProvider';

import { getBaseLogger } from '@hyperflow/logger';

import container = require('@google-cloud/container');

const Logger = getBaseLogger();

const DEFAULT_NODE_POOL_NAME = 'default-pool';

/**
 * Google Cloud Provider
 *
 * CAUTION:
 *  This provider expects that GOOGLE_APPLICATION_CREDENTIALS env
 *  is set to path containing JSON key of service account.
 *
 * NOTE:
 *  Google Container API: https://googleapis.dev/nodejs/container/2.1.1/index.html
 */
class GCPProvider extends BaseProvider {
  private clusterClient: container.v1.ClusterManagerClient;
  private projectId: string;
  private zone: string;
  private clusterName: string;
  private nodePoolName: string;

  private initialized: boolean;

  constructor() {
    super();
    Logger.trace('[GCPProvider] Constructor');
    this.initialized = false;
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void> {
    Logger.debug('[GCPProvider] Initialization');
    this.clusterClient = new container.v1.ClusterManagerClient();
    this.projectId = await this.clusterClient.getProjectId();
    const clusters = (
      await this.clusterClient.listClusters({
        projectId: this.projectId,
        zone: '-'
      })
    )[0].clusters;
    if (clusters === undefined || clusters === null) {
      throw Error('Unable to fetch clusters');
    }
    if (clusters.length != 1) {
      throw Error(
        'There must be exactly one cluster in project - found ' +
          clusters.length.toString()
      );
    }

    /* Extract cluster properties */
    const cluster = clusters[0];
    const clusterName = cluster.name;
    if (clusterName === undefined || clusterName === null) {
      throw Error('Unable to extract name from cluster');
    }
    Logger.trace('[GCPProvider] Fetched clusterName: ' + clusterName);
    this.clusterName = clusterName;
    const location = cluster.location;
    if (location === undefined || location === null) {
      throw Error('Unable to location from cluster');
    }
    Logger.trace('[GCPProvider] Fetched location: ' + location);
    this.zone = location;
    const nodePools = cluster.nodePools;
    if (nodePools === undefined || nodePools === null) {
      throw Error('Unable to fetch nodePools');
    }
    const expecteNodePoolName =
      process.env['HF_VAR_autoscalerGKEPool'] || DEFAULT_NODE_POOL_NAME;
    Logger.trace(
      '[GCPProvider] Looking for node pool with name ' + expecteNodePoolName
    );
    const nodePoolIndex = nodePools.findIndex(
      (x) => x.name == expecteNodePoolName
    );
    if (nodePoolIndex === -1) {
      throw Error("'" + expecteNodePoolName + "' node pool not found.");
    }
    this.nodePoolName = expecteNodePoolName;

    /* Mark provider as initialized. */
    this.initialized = true;

    return;
  }

  public async resizeCluster(workersNum: number): Promise<void> {
    /* Make sure provider is initialized. */
    if (this.initialized === false) {
      throw Error('Provider was not intialized');
    }
    Logger.trace('[GCPProvider] Resizing cluster to ' + workersNum);
    const request = {
      projectId: this.projectId,
      zone: this.zone,
      clusterId: this.clusterName,
      nodePoolId: this.nodePoolName,
      nodeCount: workersNum
    };
    try {
      Logger.trace('[GCPProvider] Resize request ' + JSON.stringify(request));
      const result = await this.clusterClient.setNodePoolSize(request);
      Logger.trace(
        '[GCPProvider] setNodePoolSize response' + JSON.stringify(result)
      );
    } catch (err) {
      // NOTE here we might get following error:
      //   Unable to set node pool size: {"code":9,"details":"Operation operation-1603376477524-a0fbd518 is currently operating on cluster standard-cluster-2. Please wait and try again once it is done.","metadata":{"internalRepr":{},"options":{}}}
      throw Error('Unable to set node pool size: ' + JSON.stringify(err));
    }
    return;
  }
}

export default GCPProvider;
