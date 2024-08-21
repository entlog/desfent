import Utils from "../../../Utils.js";
import ApexIR from "./ApexIR.js";

const NATURE: string = "ApexAnnotation";
const PARAM_NATURE: string = "ApexAnnotationParam";

export class ApexAnnotationParamIR extends ApexIR {
  public value: string | undefined;

  constructor(name: string) {
    super(name, PARAM_NATURE);
  }
  public toString(): string {
    return `${this.name}${this.value ? "=" + this.value : ""}`;
  }
}
export default class ApexAnnotationIR extends ApexIR {
  public parameters: ApexAnnotationParamIR[] = [];

  constructor(name: string) {
    super(name, NATURE);
  }

  public addAnnotationParam(name: string, value: string | undefined) {
    const param: ApexAnnotationParamIR = new ApexAnnotationParamIR(name);
    param.value = value;
    this.parameters.push(param);
  }

  public toString(): string {
    return `${this.name}${Utils.prettyPrint(this.parameters, "(", ")")}`;
  }
}
