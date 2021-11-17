/* eslint-disable @typescript-eslint/ban-ts-comment */

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
  constructor({ cpu, mem }: IResourceRequirements) {
    this.cpuMillis = ResourceRequirements.parseCpuString(cpu);
    this.memBytes = ResourceRequirements.parseMemString(mem);
  }

  /**
   * Getter for cpuMillis.
   */
  getCpuMillis(): number {
    return this.cpuMillis;
  }

  /**
   * Getter for memBytes.
   */
  getMemBytes(): number {
    return this.memBytes;
  }

  /**
   * Converts memory string.
   * @param mem string, eg. "10 Gi"
   * @return number of bytes
   */
  private static parseMemString(mem: string): number {
    //Logger.trace('[Resources] memoryStringToBytes(' + mem + ')');
    const format1 = mem.match(/^(?<num>\d+)$/);
    if (format1 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      const numPart: string = format1.groups.num;
      const val: number = parseInt(numPart, 10);
      return val;
    }

    const format2 = mem.match(/^(?<base>\d+)e(?<exponent>\d+)$/);
    if (format2 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      const basePart: string = format2.groups.base;
      // @ts-ignore: Object is possibly 'undefined'.
      const exponentPart: string = format2.groups.exponent;
      const baseVal: number = parseInt(basePart, 10);
      const exponentVal: number = parseInt(exponentPart, 10);
      return baseVal * Math.pow(10, exponentVal);
    }

    const format3 = mem.match(
      /^(?<num>\d+)(\.(?<fraction>\d+))?(?<unit>[EPTGMK])$/
    );
    if (format3 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      const numPart = format3.groups.num;
      const fractionPart = format3?.groups?.fraction;
      // @ts-ignore: Object is possibly 'undefined'.
      const unitPart = format3.groups.unit;
      let baseVal: number = parseInt(numPart, 10);
      if (fractionPart != undefined) {
        baseVal +=
          parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10) / 1000;
      }
      let power: number;
      switch (unitPart) {
        case 'E':
          power = 18;
          break;
        case 'P':
          power = 15;
          break;
        case 'T':
          power = 12;
          break;
        case 'G':
          power = 9;
          break;
        case 'M':
          power = 6;
          break;
        default:
          // "Ki":
          power = 3;
      }
      return baseVal * Math.pow(10, power);
    }

    const format4 = mem.match(
      /^(?<num>\d+)(\.(?<fraction>\d+))?(?<unit>[EPTGMK]i)$/
    );
    if (format4 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      const numPart = format4.groups.num;
      const fractionPart = format4?.groups?.fraction;
      // @ts-ignore: Object is possibly 'undefined'.
      const unitPart = format4.groups.unit;
      let baseVal: number = parseInt(numPart, 10);
      if (fractionPart != undefined) {
        baseVal +=
          parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10) / 1000;
      }
      let power: number;
      switch (unitPart) {
        case 'Ei':
          power = 60;
          break;
        case 'Pi':
          power = 50;
          break;
        case 'Ti':
          power = 40;
          break;
        case 'Gi':
          power = 30;
          break;
        case 'Mi':
          power = 20;
          break;
        default:
          // "Ki":
          power = 10;
      }
      return baseVal * Math.pow(2, power);
    }

    throw Error('[Resources] Unknown format');
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
      throw Error("ResourceRequirements' values must not fall below zero");
    }
    return;
  }

  public addRR(rr: ResourceRequirements): void {
    this.cpuMillis += rr.getCpuMillis();
    this.memBytes += rr.getMemBytes();
    if (this.cpuMillis < 0 || this.memBytes < 0) {
      throw Error("ResourceRequirements' values must not fall below zero");
    }
    return;
  }

  /**
   * Clones current object.
   * @return copied object
   */
  public clone(): ResourceRequirements {
    const res = new ResourceRequirements({ cpu: '0', mem: '0' });
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
    const format1 = cpu.match(/^(?<num>\d+)m$/);
    if (format1 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      const numPart = format1.groups.num;
      const val: number = parseInt(numPart, 10);
      return val;
    }

    const format2 = cpu.match(/^(?<base>\d+)(\.(?<fraction>\d+))?$/);
    if (format2 != null) {
      // @ts-ignore: Object is possibly 'undefined'.
      const basePart = format2.groups.base;
      const fractionPart = format2?.groups?.fraction;
      let totalMillis = 0;
      totalMillis += parseInt(basePart, 10) * 1000;
      if (fractionPart != undefined) {
        totalMillis += parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10);
      }

      return totalMillis;
    }

    throw Error('[Resources] Unknown format');
  }

  public static Utils = class {
    /** Proxied method */
    public static parseMemString(mem: string): number {
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
    public static getAverage(
      resArr: ResourceRequirements[]
    ): ResourceRequirements {
      /* Case when no requests are specified. */
      if (resArr.length == 0) {
        return new ResourceRequirements({ cpu: '0', mem: '0' });
      }
      /* Sum all properties and return average. */
      const [totalCpu, totalMem] = resArr.reduce(
        ([totalCpu, totalMem], res) => {
          return [totalCpu + res.cpuMillis, totalMem + res.memBytes];
        },
        [0, 0]
      );
      const result = new ResourceRequirements({
        cpu: Math.round(totalCpu / resArr.length).toString() + 'm',
        mem: Math.round(totalMem / resArr.length).toString()
      });
      return result;
    }

    /**
     * Caclulates sum of multiple ResourceRequirements.
     * @param resArr
     */
    public static getSum(resArr: ResourceRequirements[]): ResourceRequirements {
      const [totalCpu, totalMem] = resArr.reduce(
        ([totalCpu, totalMem], res) => {
          return [totalCpu + res.cpuMillis, totalMem + res.memBytes];
        },
        [0, 0]
      );
      const result = new ResourceRequirements({
        cpu: Math.round(totalCpu).toString() + 'm',
        mem: Math.round(totalMem).toString()
      });
      return result;
    }
  };

  /**
   * @inheritdoc
   */
  public toString = (): string => {
    let string = '{CPU: ' + this.cpuMillis.toString() + 'm;';
    string += ' MEM: ' + this.memBytes.toString() + 'B}';
    return string;
  };
}

export default ResourceRequirements;
