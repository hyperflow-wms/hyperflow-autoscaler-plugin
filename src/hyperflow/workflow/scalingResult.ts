import ResourceRequirements from "../../kubernetes/resourceRequirements";

interface ScoreOptions {
  skipOverProvision?: boolean;
}

class ScalingResult
{
  private price?: number;

  private totalCpuSupply: number = 0;
  private totalCpuUnderprovisionDemand: number = 0;
  private totalCpuOverprovisionDemand: number = 0;

  private totalMemSupply: number = 0;
  private totalMemUnderprovisionDemand: number = 0;
  private totalMemOverprovisionDemand: number = 0;

  private totalFrames: number;

  public constructor() {
    this.totalFrames = 0;
  }

  /**
   * Setter for price.
   * @param price
   */
  public setPrice(price: number): void {
    this.price = price;
    return;
  }

  /**
   * Getter for price.
   */
  public getPrice(): number {
    if (this.price === undefined) {
      throw Error("Price is not set");
    }
    return this.price;
  }

  /**
   * Getter for totalFrames.
   */
  public getFramesAmount(): number {
    return this.totalFrames;
  }

  /**
   * Feed object with frame, that will affect score.
   * @param supply
   * @param demand
   */
  public addFrame(supply: ResourceRequirements, demand: ResourceRequirements): void {

    /* Increase total counters. */
    this.totalCpuSupply += supply.getCpuMillis();
    this.totalMemSupply += supply.getMemBytes();
    this.totalFrames += 1;

    /* Count CPU under/overprovisioning. */
    if (demand.getCpuMillis() > supply.getCpuMillis()) {
      this.totalCpuUnderprovisionDemand += demand.getCpuMillis();
    } else if (demand.getCpuMillis() < supply.getCpuMillis()) {
      this.totalCpuOverprovisionDemand += demand.getCpuMillis();
    }
    /* Count memory under/overprovisioning. */
    if (demand.getMemBytes() > supply.getMemBytes()) {
      this.totalMemUnderprovisionDemand += demand.getMemBytes();
    } else if (demand.getMemBytes() < supply.getMemBytes()) {
      this.totalMemOverprovisionDemand += demand.getMemBytes();
    }

    return;
  }

  /**
   * Caclulates score based on feeded frames.
   * The better option, the bigger score.
   *
   * TODO: Think if 0 is great default value
   */
  public getScore({skipOverProvision = false}: ScoreOptions): number {
    /* Base scores. */
    let cpuUnderWaste = 0; // percentage of missing demand
    if (this.totalCpuUnderprovisionDemand != 0) {
      cpuUnderWaste = ((this.totalCpuSupply / this.totalCpuUnderprovisionDemand) - 1) * -1;
    }
    let cpuOverWaste = 0; // percentage of too much supply
    if (this.totalCpuOverprovisionDemand != 0 && skipOverProvision == false) {
      cpuOverWaste = (this.totalCpuSupply / this.totalCpuOverprovisionDemand) - 1;
    }
    let memUnderWaste = 0; // percentage of missing demand
    if (this.totalMemUnderprovisionDemand != 0) {
      memUnderWaste = ((this.totalMemSupply / this.totalMemUnderprovisionDemand) - 1) * -1;
    }
    let memOverWaste = 0; // percentage of too much supply
    if (this.totalMemOverprovisionDemand != 0 && skipOverProvision == false) {
      memOverWaste = (this.totalMemSupply / this.totalMemOverprovisionDemand) - 1;
    }

    /* Grouped scores - average of both percentages. */
    let underWaste = (cpuUnderWaste + memUnderWaste) / 2;
    let overWaste = (cpuOverWaste + memOverWaste) / 2;

    /* Total score */
    let resourcesWaste = underWaste + overWaste;
    let score = 1 / resourcesWaste;
    return score;
  }
}

export { ScoreOptions, ScalingResult };
