import Utils from "../../../Utils.js";
import ApexIR from "./ApexIR.js";
import CommentIR from "./CommentIR.js";
import { JDCommentIR } from "./JDCommentIR.js";

const NATURE = 'ApexEnum';
const NATURE_VALUE = 'ApexEnumValue';

export class ApexEnumValueIR extends ApexIR {
   public jdComment: JDCommentIR | undefined;
   public comments: CommentIR[] = [];
   constructor(name: string) {
      super(name, NATURE_VALUE);
   }
   public toString(): string {
      return `${this.name}${this.jdComment ? "(" + this.jdComment + ")" : ""}`
   }
}
export default class ApexEnumIR extends ApexIR {
   public values: ApexEnumValueIR[] = [];

   public jdComment: JDCommentIR | undefined;
   public comments: CommentIR[] = [];

   constructor(name: string) {
      super(name, NATURE);
   }

   public toString(): string {
      return `${this.name}${Utils.prettyPrint(this.values, '(', ')')}`
   }
}