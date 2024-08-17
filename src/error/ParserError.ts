
export const CODE_GENERIC: number = 1;
export const CODE_FAILEDATTEMPT: number = 2;
export const CODE_MALFORMED: number = 3;

export default class ParserError extends Error {
   private _code: number = CODE_GENERIC;
   private _line: number = 0;
   private _offset: number = 0;
   private _snapshot: string | undefined;

   constructor(message: string, line: number, offset: number, code: number = CODE_GENERIC, snapshot?: string) {
      super(message);
      this._code = code;
      this._line = line;
      this._offset = offset;
      this._snapshot = snapshot;
   }

   public get code(): number {
      return this.code;
   }

   public get line(): number {
      return this._line;
   }
   public get offset(): number {
      return this._offset;
   }
   public get snapshot(): string | undefined {
      return this._snapshot;
   }
}