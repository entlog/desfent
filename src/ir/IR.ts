import Utils from "../Utils.js";
import IRGroup from "./IRGroup.js";

export class IRParsingProblem {
  private message: string;
  private line: number;
  private offset: number;
  private snapshot: string | undefined;

  constructor(
    message: string,
    line: number,
    offset: number,
    snapshot?: string
  ) {
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
    return `{IR ERROR: ${this.message} (${this.line}:${this.offset}) ${
      this.snapshot ? ":" + this.snapshot : ""
    }`;
  }
}

export default abstract class IR {
  protected _name: string;
  protected _nature: string;
  private _valid: boolean = true;
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

  public get valid(): boolean {
    return this._valid;
  }

  public addParsingProblem(
    message: string,
    line: number,
    offset: number,
    snapshot?: string
  ): void {
    this.problems.push(new IRParsingProblem(message, line, offset, snapshot));
    this._valid = false;
  }

  public getErrors(): IRParsingProblem[] {
    return this.problems;
  }

  public toString(): string {
    return (
      "IR-" +
      (this.problems.length > 0
        ? "PARSEPROBLEMS=" + Utils.prettyPrint(this.problems)
        : "VALID")
    );
  }
}
