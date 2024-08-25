import ApexClassParser from "./parser/ApexClassParser.js";
import { Logger } from "@salesforce/core";
import Lexer, { Token } from "./lexer/Lexer.js";
import ApexClassLexer from "./lexer/ApexLexer.js";
import Stream from "./lexer/Stream.js";
import { Parser } from "./parser/Parser.js";
import IR from "./ir/IR.js";
import ParserError from "./error/ParserError.js";
import ApexTriggerParser from "./parser/ApexTriggerParser.js";

export enum ResourceType {
  APEXCLASS = "ApexClass",
  APEXTRIGGER = "ApexTrigger"
}
const EXT2PARSER: Map<String, ResourceType> = new Map<String, ResourceType>([
  [".cls", ResourceType.APEXCLASS],
  [".trigger", ResourceType.APEXTRIGGER],
]);

export default class TechFactory {
  /**
   * Method that identifies the resource type with the file name
   * @param filePath
   * @returns
   */
  private static getType(filePath: string): ResourceType|undefined {
    const ext: string = filePath.substring(filePath.lastIndexOf("."));
    const type: ResourceType | undefined = EXT2PARSER.get(ext);
    if (!type) {
      return undefined;
    }
    return type;
  }

  /**
   * Method that returns the appropiate parser given a file name
   * @param filePath
   * @returns
   */
  public static async getParser(filePath: string): Promise<Parser<Token, IR>|undefined> {
     const logger: Logger = await Logger.child("Parser");
    const type: ResourceType|undefined = this.getType(filePath);
    if (!type) {
      logger.warn(`Unknown type for file ${filePath}`);
      return undefined;
    }
    const lexer: Lexer<Token> = await this.getLexer(filePath, type);
    
    if (type == ResourceType.APEXCLASS) {
      return new ApexClassParser(lexer, logger);
    } else if (type === ResourceType.APEXTRIGGER) {
      return new ApexTriggerParser(lexer, logger);
    }
    return undefined;
  }

  public static async getLexer(
    filePath: string,
    type: ResourceType
  ): Promise<Lexer<Token>> {
    let stream: Stream = await Stream.open(filePath);

    const logger: Logger = await Logger.child("Lexer");
    logger.info("Testing");
    // logger.setLevel(LoggerLevel.DEBUG);
    if (type === ResourceType.APEXCLASS || type === ResourceType.APEXTRIGGER) {
      return new ApexClassLexer(filePath, stream, logger);
    } else {
      throw new Error("Invalid");
    }
  }
}
