import Loggers from './logger';

class Utils {
  static memoryStringToBytes(mem: string): number | Error  {
    //Loggers.base.silly('[Utils] memoryStringToBytes(' + mem + ')');
    let format1 = mem.match(/^(?<num>\d+)$/);
    if (format1 != null) {
      let numPart = format1?.groups?.num;
      if (numPart == undefined) {
        throw Error('Fatal error');
      }
      let val: number = parseInt(numPart, 10);
      return val;
    }

    let format2 = mem.match(/^(?<base>\d+)e(?<exponent>\d+)$/);
    if (format2 != null) {
      let basePart = format2?.groups?.base;
      let exponentPart = format2?.groups?.exponent;
      if (basePart == undefined || exponentPart == undefined) {
        throw Error('Fatal error');
      }
      let baseVal: number = parseInt(basePart, 10);
      let exponentVal: number = parseInt(exponentPart, 10);
      return baseVal * Math.pow(10, exponentVal);;
    }

    let format3 = mem.match(/^(?<num>\d+)(?<unit>[EPTGMK])$/);
    if (format3 != null) {
      let numPart = format3?.groups?.num;
      let unitPart = format3?.groups?.unit;
      if (numPart == undefined || unitPart == undefined) {
        throw Error('Fatal error');
      }
      let baseVal: number = parseInt(numPart, 10);
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
        case "K":
          power = 3;
          break;
        default:
        throw Error('Fatal error');
      }
      return baseVal * Math.pow(10, power);;
    }

    let format4 = mem.match(/^(?<num>\d+)(?<unit>[EPTGMK]i)$/);
    if (format4 != null) {
      let numPart = format4?.groups?.num;
      let unitPart = format4?.groups?.unit;
      if (numPart == undefined || unitPart == undefined) {
        throw Error('Fatal error');
      }
      let baseVal: number = parseInt(numPart, 10);
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
        case "Ki":
          power = 10;
          break;
        default:
        throw Error('Fatal error');
      }
      return baseVal * Math.pow(2, power);;
    }

    return Error("[Utils] Unknown format");
  }

  static cpuStringToMillis(cpu: string): number | Error {
    //Loggers.base.silly('[Utils] cpuStringToMillis(' + cpu + ')');
    let format1 = cpu.match(/^(?<num>\d+)m$/);
    if (format1 != null) {
      let numPart = format1?.groups?.num;
      if (numPart == undefined) {
        throw Error('Fatal error');
      }
      let val: number = parseInt(numPart, 10);
      return val;
    }

    let format2 = cpu.match(/^(?<base>\d+)(\.(?<fraction>\d+))?$/);
    if (format2 != null) {
      let basePart = format2?.groups?.base;
      let fractionPart = format2?.groups?.fraction;
      if (basePart == undefined) {
        throw Error('Fatal error');
      }
      let totalMillis: number = 0;
      totalMillis += parseInt(basePart, 10) * 1000;
      if (fractionPart != undefined) {
        totalMillis += parseInt(fractionPart.substr(0, 3).padEnd(3, '0'), 10);
      }

      return totalMillis;
    }

    return Error("[Utils] Unknown format");
  }
}

export default Utils;
