import { RootNature } from "../Natures.js";
import ApexIR from "./ApexIR.js";
import CommentIR from "./CommentIR.js";
import { JDCommentIR } from "./JDCommentIR.js";


export default class ApexTriggerIR extends ApexIR {
   public jdComment: JDCommentIR | undefined;
   public comments: CommentIR[] = [];
   public onObject: string|undefined;

   public beforeInsert:boolean = false;
   public beforeUpdate:boolean = false;
   public beforeDelete:boolean = false;
   public beforeUndelete:boolean = false;
   public afterInsert:boolean = false;
   public afterUpdate:boolean = false;
   public afterDelete:boolean = false;
   public afterUndelete:boolean = false;

   public maxNestDepth:number = 0;
   public startLine: number = 0;
   public endLine: number = 0;
   public get length() {
     return this.endLine - this.startLine + 1;
   }


   constructor(name:string) {
      super(name, RootNature.ApexTrigger);
   }
   public toString():string {
      return `Trigger:Name=${this.name}`;
   }
}