import ParserError, { CODE_FAILEDATTEMPT } from "./ParserError.js";

export default class NoMatchParsingException extends ParserError {
  constructor(message: string, line: number, offset: number) {
    super(message, CODE_FAILEDATTEMPT, line, offset);
  }
}
