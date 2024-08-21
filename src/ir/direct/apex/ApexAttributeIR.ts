import ApexAnnotationIR from "./ApexAnnotationIR.js";
import ApexIR from "./ApexIR.js";
import ApexTypeIR from "./ApexTypeIR.js";
import { JDCommentIR } from "./JDCommentIR.js";

const NATURE = "ApexAttribute";

export default class ApexAttributeIR extends ApexIR {
  public type: ApexTypeIR | undefined;
  public jdComment: JDCommentIR | undefined;
  public accessModifier: string = "package";
  public isStatic: boolean = false;
  public isFinal: boolean = false;
  public line: number = 0;
  public annotations: ApexAnnotationIR[] = [];

  constructor(name: string) {
    super(name, NATURE);
  }

  public toString(): string {
    return `Attribute:${this.name}-${this.type} [${this.line}] (${
      this.accessModifier
    } ${this.isStatic ? "static" : ""} ${this.isFinal ? "final" : ""})`;
  }
}
