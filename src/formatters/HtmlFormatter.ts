import Handlebars from "handlebars";
import IR from "../ir/IR.js";
import fs from 'graceful-fs';

import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import ParserError, { CODE_GENERIC } from "../error/ParserError.js";
import ApexTypeIR from "../ir/direct/apex/ApexTypeIR.js";
import { JDCommentIR } from "../ir/direct/apex/JDCommentIR.js";

const NATURE_2_TEMPLATE = new Map<string, string>([
   ['ApexClass', '../../../resources/html/apexclass.hbs'],
   ['ApexEnum', '../../../resources/html/apexenum.hbs']
])


export default class HtmlFormatter {
   static common:string;

   private static copy(dir:string, todir:string, log:(message?: string, ...args: any[]) => void) {
      log('Creating css dir: ' + todir);
      if (!fs.existsSync(todir)) {
         fs.mkdirSync(todir);
      }
      const csspath:string = path.resolve(fileURLToPath(import.meta.url), dir);
      fs.readdirSync(csspath).forEach(f => {
         fs.copyFileSync(path.resolve(csspath, f), path.resolve(todir, f));
      });
   }
   static prepare(dir:string, log:(message?: string, ...args: any[]) => void):void {
      log('Preparing html output');
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir);
      }
      this.copy(path.resolve(fileURLToPath(import.meta.url), '../../../resources/css'), path.resolve(dir, 'css'), log);
      this.copy(path.resolve(fileURLToPath(import.meta.url), '../../../resources/images'), path.resolve(dir, 'images'), log);
      const templatepath:string = path.resolve(fileURLToPath(import.meta.url), '../../../resources/html/common.hbs'); // path.resolve(__dirname, '../../resources/html/apexclass.hhtml');
      HtmlFormatter.common = fs.readFileSync(templatepath, { encoding: "utf-8"});

      Handlebars.registerHelper('eq', (v1, v2) => {
         return v1 == v2;
      });
      Handlebars.registerHelper('empty', (l) => {
         return l.length == 0;
      });
      Handlebars.registerHelper('generateTypeString', (t:ApexTypeIR) => {
         let ret:string = t.name;
         if (t.generics.length > 0) {
            ret += '<' + t.generics.map(g => g.name).join(', ') + '>';
         }
         return ret;
      });

      Handlebars.registerHelper('filterJDAnnotations', (o:JDCommentIR, typesIncluded:string, typesExcluded:string) => {
         const included:Set<string> = new Set<string>();
         const excluded:Set<string> = new Set<string>();
         if (typesIncluded) {
            (JSON.parse(typesIncluded) as string[]).forEach(i => included.add(i));
         }
         if (typesExcluded) {
            (JSON.parse(typesExcluded) as string[]).forEach(e => excluded.add(e));
         }
         log(`Executing filterJDAnnotations with ${included.entries()}`);
         return o.annotations.filter(a => 
            (included.size == 0 || included.has(a.name)) 
            && (excluded.size == 0 || !excluded.has(a.name)));
         
      });
   }
   
   private static getTemplate(nature:string|any): string {
      const templatefile:string|undefined = NATURE_2_TEMPLATE.get(nature);
      if (!templatefile) {
         throw new ParserError(`No template found for nature ${nature}`, 0, 0, CODE_GENERIC);
      }
      const templatepath:string = path.resolve(fileURLToPath(import.meta.url), templatefile); // path.resolve(__dirname, '../../resources/html/apexclass.hhtml');
      const template:string = this.common + '\n' + fs.readFileSync(templatepath, { encoding: "utf-8"});
      return template;
      
   }

   
   static format(ir:IR, dir:string, log:(message?: string, ...args: any[]) => void):void {
      const template:string = this.getTemplate(ir.nature);
      let doTemplate:HandlebarsTemplateDelegate = Handlebars.compile(template);
      let output:string = doTemplate({root: ir}, { allowProtoPropertiesByDefault: true});
      let filename:string = path.resolve(dir, ir.name + '.html');
      fs.writeFileSync(filename, output);
   }
}