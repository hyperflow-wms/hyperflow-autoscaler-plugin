import BaseProvider from './baseProvider';

import { getBaseLogger } from '../../utils/logger';

import container = require('@google-cloud/container');

const Logger = getBaseLogger();

/**
 * Google Cloud Procider
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

  constructor()
  {
    super();
    Logger.silly("[GCPProvider] Constructor");
  }

  /**
   * Provider initialization.
   */
  public async initialize(): Promise<void | Error> {
    Logger.debug("[GCPProvider] Initialization");
    this.clusterClient = new container.v1.ClusterManagerClient();
    this.projectId = await this.clusterClient.getProjectId();
    let clusters = (await this.clusterClient.listClusters({projectId: this.projectId, zone: "-"}))[0].clusters;
    if (clusters === undefined || clusters === null) {
      return Error("Unable to fetch clusters");
    }
    if (clusters.length != 1) {
      return Error("There must be exactly one cluster in project - found " + clusters.length.toString());
    }

    /* Extract cluster properties */
    let cluster = clusters[0];
    let clusterName = cluster.name;
    if (clusterName === undefined || clusterName === null) {
      return Error("Unable to extract name from cluster");
    }
    Logger.silly("[GCPProvider] Fetched clusterName: " + clusterName);
    this.clusterName = clusterName;
    let location = cluster.location;
    if (location === undefined || location === null) {
      return Error("Unable to location from cluster");
    }
    Logger.silly("[GCPProvider] Fetched location: " + location);
    this.zone = location;
    let nodePools = cluster.nodePools;
    if (nodePools === undefined || nodePools === null) {
      return Error("Unable to fetch nodePools");
    }
    if (nodePools.length != 1) {
      return Error("There must be exactly one node pool in cluster - found " + nodePools.length.toString());
    }
    let nodePool = nodePools[0];
    let nodePoolName = nodePool.name;
    if (nodePoolName === undefined || nodePoolName === null) {
      return Error("Unable to extract node pool name");
    }
    Logger.silly("[GCPProvider] Fetched nodePoolName: " + nodePoolName);
    this.nodePoolName = nodePoolName;

    return;
  }

  public async resizeCluster(workersNum: number) {
    Logger.silly("[GCPProvider] Resizing cluster to " + workersNum);
    const request = {
      projectId: this.projectId,
      zone: this.zone,
      clusterId: this.clusterName,
      nodePoolId: this.nodePoolName,
      nodeCount: workersNum,
    };
    try {
      Logger.silly("[GCPProvider] Resize request " + JSON.stringify(request));
      let result = await this.clusterClient.setNodePoolSize(request);
      Logger.silly("[GCPProvider] setNodePoolSize response" + JSON.stringify(result));

    } catch (err) {
      return Error("Unable to set node pool size: " + JSON.stringify(err));
    }
    return;
  }
}

export default GCPProvider;
