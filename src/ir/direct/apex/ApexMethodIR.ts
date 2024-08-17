import Utils from "../../../Utils.js";
import ApexAnnotationIR from "./ApexAnnotationIR.js";
import { APX_ANNOTATION_ISTEST } from "./ApexConstants.js";
import ApexIR from "./ApexIR.js";
import ApexParameterIR from "./ApexParameterIR.js";
import ApexStaticBlockIR from "./ApexStaticBlockIR.js";
import ApexTypeIR from "./ApexTypeIR.js";
import CommentIR from "./CommentIR.js";
import { JDCommentIR } from "./JDCommentIR.js";

const NATURE: string = 'ApexMethod';

export default class ApexMethodIR extends ApexIR {
   public accessModifier: string = 'package';
   public isStatic: boolean = false;
   public isAbstract: boolean = false;
   public isVirtual: boolean = false;
   public isTestMethod: boolean = false;
   public isOverriding: boolean = false;
   public isConstructor: boolean = false;

   public returnType: ApexTypeIR | null = null;
   public annotations: ApexAnnotationIR[] = [];

   public jdComment: JDCommentIR | undefined;
   public comments: CommentIR[] = [];


   public startLine: number = 0;
   public endLine: number = 0;
   public get length() {
      return this.endLine - this.startLine + 1;
   }
   public maxNestDepth: number = 0;

   public parameters: ApexParameterIR[] = [];

   constructor(name: string) {
      super(name, NATURE);
   }

   public toString(): string {
      return `${this.name}${Utils.prettyPrint(this.parameters, '(', ')')}:(${this.startLine}-${this.endLine}:${this.length},${this.maxNestDepth})`;
   }



}