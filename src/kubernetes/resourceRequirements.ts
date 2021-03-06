import { getBaseLogger } from '../utils/logger';

const Logger = getBaseLogger();

interface IResourceRequirements {
  cpu: string;
  mem: string;
}

class ResourceRequirements {

  private cpuMillis: number;
  private memBytes: number;

  /**
   * Constructor.
   */
  constructor({cpu, mem}: IResourceRequirements) {
    this.cpuMillis = ResourceRequirements.parseCpuString(cpu);
    this.memBytes = ResourceRequirements.parseMemString(mem);
  }

  /**
   * Getter for cpuMillis.
   */
  getCpuMillis() {
    return this.cpuMillis;
  }

  /**
   * Getter for memBytes.
   */
  getMemBytes() {
    return this.memBytes;
  }

  /**
   * Converts memory string.
   * @param mem string, eg. "10 Gi"
   * @return number of bytes
   */
  private static parseMemString(mem: string): number  {
    //Logger.trace('[Resources] memoryStringToBytes(' + mem + ')');
    let format1 = mem.match(/^(?<num>\d+)$/);
    if (format1 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      let numPart: string = format1.groups.num;
      let val: number = parseInt(numPart, 10);
      return val;
    }

    let format2 = mem.match(/^(?<base>\d+)e(?<exponent>\d+)$/);
    if (format2 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      let basePart: string = format2.groups.base;
      // @ts-ignore: Object is possibly 'undefined'.
      let exponentPart: string = format2.groups.exponent;
      let baseVal: number = parseInt(basePart, 10);
      let exponentVal: number = parseInt(exponentPart, 10);
      return baseVal * Math.pow(10, exponentVal);;
    }

    let format3 = mem.match(/^(?<num>\d+)(\.(?<fraction>\d+))?(?<unit>[EPTGMK])$/);
    if (format3 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      let numPart = format3.groups.num;
      let fractionPart = format3?.groups?.fraction;
      // @ts-ignore: Object is possibly 'undefined'.
      let unitPart = format3.groups.unit;
      let baseVal: number = parseInt(numPart, 10);
      if (fractionPart != undefined) {
        baseVal += parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10) / 1000;
      }
      let power: number;
      switch (unitPart) {
        case "E":
          power = 18;
          break;
        case "P":
          power = 15;
          break;
        case "T":
          power = 12;
          break;
        case "G":
          power = 9;
          break;
        case "M":
          power = 6;
          break;
        default: // "Ki":
          power = 3;
      }
      return baseVal * Math.pow(10, power);;
    }

    let format4 = mem.match(/^(?<num>\d+)(\.(?<fraction>\d+))?(?<unit>[EPTGMK]i)$/);
    if (format4 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      let numPart = format4.groups.num;
      let fractionPart = format4?.groups?.fraction;
      // @ts-ignore: Object is possibly 'undefined'.
      let unitPart = format4.groups.unit;
      let baseVal: number = parseInt(numPart, 10);
      if (fractionPart != undefined) {
        baseVal += parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10) / 1000;
      }
      let power: number;
      switch (unitPart) {
        case "Ei":
          power = 60;
          break;
        case "Pi":
          power = 50;
          break;
        case "Ti":
          power = 40;
          break;
        case "Gi":
          power = 30;
          break;
        case "Mi":
          power = 20;
          break;
        default: // "Ki":
          power = 10;
      }
      return baseVal * Math.pow(2, power);;
    }

    throw Error("[Resources] Unknown format");
  }

  /**
   * Increases resource with values from another one.
   * Useful for calculating multiple resources without
   * constructing new objects.
   * @param cpuMillis
   * @param memBytes
   */
  public add(cpuMillis: number, memBytes: number): void {
    this.cpuMillis += cpuMillis;
    this.memBytes += memBytes;
    if (this.cpuMillis < 0 || this.memBytes < 0) {
      throw Error("ResourceRequirements' values must not fall below zero")
    }
    return;
  }

  /**
   * Clones current object.
   * @return copied object
   */
  public clone(): ResourceRequirements {
    let res = new ResourceRequirements({cpu: "0", mem: "0"});
    res.cpuMillis = this.cpuMillis;
    res.memBytes = this.memBytes;
    return res;
  }

  /**
   * Converts CPU string.
   * @param cpu string, eg. "4.5"
   * @return number of millis
   */
  private static parseCpuString(cpu: string): number {
    //Logger.trace('[Resources] parseCpuString(' + cpu + ')');
    let format1 = cpu.match(/^(?<num>\d+)m$/);
    if (format1 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      let numPart = format1.groups.num;
      let val: number = parseInt(numPart, 10);
      return val;
    }

    let format2 = cpu.match(/^(?<base>\d+)(\.(?<fraction>\d+))?$/);
    if (format2 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      let basePart = format2.groups.base;
      let fractionPart = format2?.groups?.fraction;
      let totalMillis: number = 0;
      totalMillis += parseInt(basePart, 10) * 1000;
      if (fractionPart != undefined) {
        totalMillis += parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10);
      }

      return totalMillis;
    }

    throw Error("[Resources] Unknown format");
  }

  public static Utils = class {
    /** Proxied method */
    public static parseMemString(mem: string): number  {
      return ResourceRequirements.parseMemString(mem);
    }

    /** Proxied method */
    public static parseCpuString(cpu: string): number {
      return ResourceRequirements.parseCpuString(cpu);
    }

    /**
     * Calculates average of multiple ResourceRequirements.
     * @param resArr
     */
    public static getAverage(resArr: ResourceRequirements[]): ResourceRequirements {
      /* Case when no requests are specified. */
      if (resArr.length == 0) {
        return new ResourceRequirements({cpu: "0", mem: "0"});
      }
      /* Sum all properties and return average. */
      let totalCpu = 0;
      let totalMem = 0;
      for (let res of resArr) {
        totalCpu += res.cpuMillis;
        totalMem += res.memBytes;
      }
      let result = new ResourceRequirements({
        cpu: Math.round(totalCpu / resArr.length).toString() + "m",
        mem: Math.round(totalMem / resArr.length).toString(),
      });
      return result;
    }

    /**
     * Caclulates sum of multiple ResourceRequirements.
     * @param resArr
     */
    public static getSum(resArr: ResourceRequirements[]): ResourceRequirements {
      let totalCpu = 0;
      let totalMem = 0;
      for (let res of resArr) {
        totalCpu += res.cpuMillis;
        totalMem += res.memBytes;
      }
      let result = new ResourceRequirements({
        cpu: Math.round(totalCpu).toString() + "m",
        mem: Math.round(totalMem).toString(),
      });
      return result;
    }
  }

  /**
   * @inheritdoc
   */
  public toString = () : string => {
    let string = "{CPU: " + this.cpuMillis.toString() + "m;";
    string += " MEM: " + this.memBytes.toString() + "B}";
    return string;
  }
}

export default ResourceRequirements;
