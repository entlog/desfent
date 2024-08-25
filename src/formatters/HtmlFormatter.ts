import Handlebars from "handlebars";
import IR from "../ir/IR.js";
import fs from "graceful-fs";

import { fileURLToPath } from "url";
import path from "path";
import ParserError, { CODE_GENERIC } from "../error/ParserError.js";
import IRGroup from "../ir/IRGroup.js";
import { RootNature } from "../ir/direct/Natures.js";
import registerHelpers from "./FormatHelpers.js";
import { Logger } from "@salesforce/core";

const NATURE_2_TEMPLATE = new Map<string, string>([
   ["ApexClass", "../../../resources/html/apexclass.hbs"],
   ["ApexEnum", "../../../resources/html/apexenum.hbs"],
   ["ApexTrigger", "../../../resources/html/apextrigger.hbs"],
]);

export default class HtmlFormatter {
   static common: string;
   static logger:Logger|undefined;

   private static copy(
      dir: string,
      todir: string
   ) {
      this.logger?.info("Creating css dir: " + todir);
      if (!fs.existsSync(todir)) {
         fs.mkdirSync(todir);
      }
      const csspath: string = path.resolve(fileURLToPath(import.meta.url), dir);
      fs.readdirSync(csspath).forEach((f) => {
         fs.copyFileSync(path.resolve(csspath, f), path.resolve(todir, f));
      });
   }
   

   static async prepare(
      dir: string
   ): Promise<void> {
      this.logger = await Logger.child("Formatter");
      this.logger?.info("Preparing html output");
      Handlebars.logger.log = (level: number, obj: string) => this.logger?.info(obj);
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir);
      }
      for (let nature in RootNature) {
         const natureDir = path.resolve(dir, nature);
         if (!fs.existsSync(natureDir)) {
            fs.mkdirSync(natureDir);
         }
      }
      this.copy(
         path.resolve(fileURLToPath(import.meta.url), "../../../resources/css"),
         path.resolve(dir, "css")
      );
      this.copy(
         path.resolve(fileURLToPath(import.meta.url), "../../../resources/images"),
         path.resolve(dir, "images")
         
      );
      const templatepath: string = path.resolve(
         fileURLToPath(import.meta.url),
         "../../../resources/html/common.hbs"
      ); // path.resolve(__dirname, '../../resources/html/apexclass.hhtml');
      HtmlFormatter.common = fs.readFileSync(templatepath, { encoding: "utf-8" });
      
      registerHelpers(this.logger);
   }

   private static getTemplateByFilename(filename: string):string {
      const templatepath: string = path.resolve(
         fileURLToPath(import.meta.url),
         filename
      ); // path.resolve(__dirname, '../../resources/html/apexclass.hhtml');
      const template: string =
      this.common + "\n" + fs.readFileSync(templatepath, { encoding: "utf-8" });
      return template;
   }
   private static getTemplateByNature(nature: string | any): string {
      const templatefile: string | undefined = NATURE_2_TEMPLATE.get(nature);
      if (!templatefile) {
         throw new ParserError(
            `No template found for nature ${nature}`,
            0,
            0,
            CODE_GENERIC
         );
      }
      return this.getTemplateByFilename(templatefile);
   }

   private static formatBase(group:IRGroup, dir: string):void {
      const files:string[] = [
         "../../../resources/html/index.hbs",
         "../../../resources/html/nothingSelected.hbs"
      ]
      for (let file of files) {
         const template:string = this.getTemplateByFilename(file);
         let doTemplate: HandlebarsTemplateDelegate = Handlebars.compile(template);
         try {
            let output: string = doTemplate(
               { group },
               { allowProtoPropertiesByDefault: true }
            );
            let filename: string = path.resolve(dir, path.basename(file).replace('.hbs', '.html'));
            fs.writeFileSync(filename, output);
         } catch (e) {
            this.logger?.info(`ERROR on index: ${e} ${JSON.stringify(e)}`);
         }
      }
   }


   static format(group: IRGroup,
      dir: string,
      progressCallback: (current:number, total:number) => void
   ): void {
      this.logger?.info(`Formatting ${group.size} components`);
      this.formatBase(group, dir);
      let idx:number = 0;
      for (const tree of group.trees) {
         if (tree.valid) {
            this.formatSingle(tree, group, dir);
         } else {
            this.formatInvalid(group.getFilenameForIR(tree) as string, tree, dir);
         }
         idx++;
         progressCallback(idx, group.size);
      }
   }

   private static formatInvalid(filename:string, ir: IR, dir:string): void {
      
      this.logger?.info('Formatting invalid ' + filename);
      const template: string = this.getTemplateByFilename("../../../resources/html/problems.hbs");

      let doTemplate: HandlebarsTemplateDelegate = Handlebars.compile(template);
      try {
         let output: string = doTemplate(
            { root: ir, filename },
            { allowProtoPropertiesByDefault: true }
         );
         let outfilename: string = path.resolve(dir, ir.nature, ir.name + ".html");
         fs.writeFileSync(outfilename, output);
      } catch (e) {
         this.logger?.info(`ERROR on ir ${ir.name}: ${e} -> ${(e as Error).stack}`);
      }
   }
   private static formatSingle(
      ir: IR,
      group: IRGroup,
      dir: string
   ): void {
      
      const template: string = this.getTemplateByNature(ir.nature);
      let doTemplate: HandlebarsTemplateDelegate = Handlebars.compile(template);
      try {
         let output: string = doTemplate(
            { root: ir, group },
            { allowProtoPropertiesByDefault: true }
         );
         let filename: string = path.resolve(dir, ir.nature, ir.name + ".html");
         fs.writeFileSync(filename, output);
      } catch (e) {
         this.logger?.info(`ERROR on ir ${ir.name}: ${e} -> ${(e as Error).stack}`);
      }
   }
}
