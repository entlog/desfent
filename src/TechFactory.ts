import ApexClassParser from './parser/ApexClassParser.js';
import { Logger } from '@salesforce/core';
import Lexer, { Token } from './lexer/Lexer.js';
import ApexClassLexer from './lexer/ApexClassLexer.js';
import Stream from './lexer/Stream.js';
import { Parser } from './parser/Parser.js';
import IR from './ir/IR.js';
import ParserError from './error/ParserError.js';


export enum ResourceType {
   APEXCLASS = 'ApexClass'
};

const EXT2PARSER: Map<String, ResourceType> = new Map<String, ResourceType>([
   ['.cls', ResourceType.APEXCLASS]
]);


export default class TechFactory {
   /**
    * Method that identifies the resource type with the file name
    * @param filePath 
    * @returns 
    */
   private static getType(filePath: string): ResourceType {
      const ext: string = filePath.substring(filePath.lastIndexOf('.'));
      const type: ResourceType | undefined = EXT2PARSER.get(ext);
      if (!type) {
         throw new ParserError(`Unknown resource ${filePath}`, 0, 0);
      }
      return type;
   }

   /**
    * Method that returns the appropiate parser given a file name
    * @param filePath 
    * @returns 
    */
   public static async getParser(filePath: string): Promise<Parser<Token, IR>> {
      const type: ResourceType = this.getType(filePath);
      const lexer: Lexer<Token> = await this.getLexer(filePath, type);
      const logger: Logger = await Logger.child('Parser');

      if (type == ResourceType.APEXCLASS) {

         return new ApexClassParser(lexer, logger);
      }
      throw new ParserError(`Unknown resource ${filePath}`, 0, 0);
   }



   public static async getLexer(filePath: string, type: ResourceType): Promise<Lexer<Token>> {
      let stream: Stream = await Stream.open(filePath);

      const logger: Logger = await Logger.child('Lexer');
      logger.info('Testing');
      // logger.setLevel(LoggerLevel.DEBUG);
      if (type === ResourceType.APEXCLASS) {
         return new ApexClassLexer(filePath, stream, logger);
      } else {
         throw new Error('Invalid');
      }
   }
}