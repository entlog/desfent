import Utils from "../Utils.js";
import IRGroup from "./IRGroup.js";


export class IRParsingProblem {
   private message: string;
   private line: number;
   private offset: number;
   private snapshot: string | undefined;

   constructor(message: string, line: number, offset: number, snapshot?: string) {
      this.message = message;
      this.line = line;
      this.offset = offset;
      this.snapshot = snapshot;
   }

   public getMessage(): string {
      return this.message;
   }
   public getLine(): number {
      return this.line;
   }
   public getOffset(): number {
      return this.offset;
   }

   public toString(): string {
      return `{ERROR: ${this.message} (${this.line}:${this.offset}) ${this.snapshot ? ':' + this.snapshot : ''}`;
   }
}

export default abstract class IR {
   protected _name: string;
   protected _nature: string;
   private root: IRGroup | undefined;
   private valid: boolean = true;
   private problems: IRParsingProblem[] = [];

   constructor(name: string, nature: string) {
      this._name = name;
      this._nature = nature;
   }

   public get name(): string {
      return this._name;
   }
   public get nature(): string {
      return this._nature;
   }

   public isValid(): boolean {
      return this.valid;
   }
   public setValid(valid: boolean): void {
      this.valid = valid;
   }

   public addParsingProblem(message: string, line: number, offset: number, snapshot?: string): void {
      this.problems.push(new IRParsingProblem(message, line, offset, snapshot));
   }

   public getErrors(): IRParsingProblem[] {
      return this.problems;
   }

   public setRoot(root: IRGroup): void {
      this.root = root;
   }
   public getRoot(): IRGroup | undefined {
      return this.root;
   }

   public toString(): string {
      return "IR-" + (this.problems.length > 0 ? "PARSEPROBLEMS=" + Utils.prettyPrint(this.problems) : "VALID");
   }
}