import Utils from "../../../Utils.js";
import ApexAnnotationIR from "./ApexAnnotationIR.js";
import ApexAttributeIR from "./ApexAttributeIR.js";
import ApexEnumIR from "./ApexEnumIR.js";
import ApexIR from "./ApexIR.js";
import ApexMethodIR from "./ApexMethodIR.js";
import ApexStaticBlockIR from "./ApexStaticBlockIR.js";
import ApexTypeIR from "./ApexTypeIR.js";
import { JDCommentIR } from "./JDCommentIR.js";


const NATURE = 'ApexClass';

export default class ApexClassIR extends ApexIR {
   // Documentation comment
   public jdComment: JDCommentIR | undefined;

   public accessModifier: string = 'package';
   public isWithSharing: boolean = false;
   public isAbstract: boolean = false;
   public isVirtual: boolean = false;
   public isClass: boolean = true;
   public interfaces: ApexTypeIR[] = [];
   public baseClass: ApexTypeIR | undefined;
   public annotations: ApexAnnotationIR[] = [];
   public constructorMethod: ApexMethodIR | undefined;
   public methods: ApexMethodIR[] = [];
   public innerClasses: ApexClassIR[] = [];

   public staticBlocks: ApexStaticBlockIR[] = [];
   public attributes: ApexAttributeIR[] = [];

   public enums: ApexEnumIR[] = [];

   public startLine: number = 0;
   public endLine: number = 0;
   public get length(): number {
      return this.endLine - this.startLine + 1;
   }

   constructor(name: string) {
      super(name, NATURE);
   }

   public toString(): string {
      return `${this.isClass ? 'Class' : 'Interface'}:Name=${this.name},\nannotations=${this.annotations},\ncomment=${this.jdComment},\nbaseClass=${this.baseClass},\ninterfaces=${this.interfaces}\n\tenums=${Utils.prettyPrint(this.enums)}\n\tattributes=${Utils.prettyPrint(this.attributes)}\n\tconstructor=${this.constructorMethod}\n\tmethods=${this.methods}\n\tinnerclasses=${Utils.prettyPrint(this.innerClasses)}\n\tstaticblocks=${Utils.prettyPrint(this.staticBlocks)}`
   }
}