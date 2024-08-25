import ApexIR from "./ApexIR.js";
import ApexTypeIR from "./ApexTypeIR.js";

const NATURE = "ApexParameter";

export default class ApexParameterIR extends ApexIR {
  public type: ApexTypeIR;
  public isFinal: boolean = false;

  constructor(name: string, type: ApexTypeIR, isFinal: boolean) {
    super(name, NATURE);
    this.type = type;
    this.isFinal = isFinal;
  }

  public toString(): string {
    return `${this.type} -> ${this.name}`;
  }
}
