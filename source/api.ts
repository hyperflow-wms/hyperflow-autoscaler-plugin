import { RedisClient } from 'redis';

class API {
  private rcl: RedisClient;
  private wflib: object;
  private plugins: any[];

  constructor(rcl: RedisClient, wflib: object, plugins: any[]) {
    this.rcl = rcl;
    this.wflib = wflib;
    this.plugins = plugins;
  }

  public addNumbers(a: number, b: number): number {
    console.log('addNumbers', a, b);
    return a + b;
  }
}

export default API;
