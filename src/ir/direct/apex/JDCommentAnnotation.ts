import ApexIR from "./ApexIR.js";


const NATURE: string = 'JDCommentAnnotation'
export default class JDCommentAnnotationIR extends ApexIR {
   public param: string | undefined;
   public explanation: string | undefined;

   public constructor(name: string) {
      super(name, NATURE);
   }

   public toString(): string {
      return `${this.name} ${this.param ? '(' + this.param + ')' : ''} -> ${this.explanation ? this.explanation : ''}`;
   }
}