import ApexIR from "./ApexIR.js";
import CommentIR from "./CommentIR.js";
import { JDCommentIR } from "./JDCommentIR.js";

const NATURE: string = 'ApexStaticBlock';

export default class ApexStaticBlockIR extends ApexIR {
   constructor() {
      super('staticBlock', NATURE);
   }


   public get numLines() {
      return this.endLine - this.startLine + 1;
   }

   public startLine: number = 0;
   public endLine: number = 0;
   public maxNestingDepth: number = 0;
   public jdComment: JDCommentIR | undefined;
   public comment: CommentIR | undefined;

   public toString(): string {
      return `static(${this.startLine}-${this.endLine})`
   }

}