import Handlebars from "handlebars";
import ApexClassIR from "../ir/direct/apex/ApexClassIR.js";
import ApexTypeIR from "../ir/direct/apex/ApexTypeIR.js";
import JDCommentAnnotationIR from "../ir/direct/apex/JDCommentAnnotation.js";
import { JDCommentIR } from "../ir/direct/apex/JDCommentIR.js";
import IR from "../ir/IR.js";
import IRGroup from "../ir/IRGroup.js";
import { Logger } from "@salesforce/core";
import ApexIR from "../ir/direct/apex/ApexIR.js";
import ApexTriggerIR from "../ir/direct/apex/ApexTriggerIR.js";

const registerHelpers = (logger: Logger) => {
   
   Handlebars.registerHelper("eq", (v1, v2) => {
      return v1 == v2;
   });
   Handlebars.registerHelper("empty", (l) => {
      return l.length == 0;
   });
   Handlebars.registerHelper("generateTypeString", (t: ApexTypeIR) => {
      logger.info(`Creating type string for ${t}` );
      let ret: string = t.name;
      if (t.generics.length > 0) {
         ret += "<" + t.generics.map((g) => g.name).join(", ") + ">";
      }
      return ret;
   });
   
   Handlebars.registerHelper(
      "filterJDAnnotations",
      (o: JDCommentIR, typesIncluded: string, typesExcluded: string) => {
         const included: Set<string> = new Set<string>();
         const excluded: Set<string> = new Set<string>();
         if (typesIncluded) {
            (JSON.parse(typesIncluded) as string[]).forEach((i) =>
               included.add(i)
         );
      }
      if (typesExcluded) {
         (JSON.parse(typesExcluded) as string[]).forEach((e) =>
            excluded.add(e)
      );
   }
   const ret: JDCommentAnnotationIR[] = o.annotations.filter(
      (a) =>
         (included.size == 0 || included.has(a.name)) &&
      (excluded.size == 0 || !excluded.has(a.name))
   );
   return ret;
});

Handlebars.registerHelper("dt", () => {
   return new Date().toLocaleString();
});
Handlebars.registerHelper("nature", (ir: ApexIR, options):string => {
   switch (ir.nature) {
      case 'ApexClass':
         if ((ir as ApexClassIR).isClass) {
            return 'Apex Class';
         } else {
            return 'Apex Interface'
         }
      case 'ApexEnum':
         return 'Apex Enum';
      case 'ApexTrigger':
         return 'Apex Trigger';
      default:
         return 'Unknown';
   }
});

Handlebars.registerHelper("headerLinks", (nature: string, options):string => {
   logger.info(`Generating header links for nature ${nature}`);
   let contexts:any[] = [];
   let ret = '';
   switch (nature) {
      case 'ApexClass':
      contexts = [ 
         { text: 'Field Summary', link: '#fieldSummary' },
         { text: 'Method Summary', link: '#methodSummary' },
         { text: 'Field Detail', link: '#fieldDetail' },
         { text: 'Method Detail', link: '#methodDetail' },
         { text: 'Show Private', link: 'javascript:hidePrivate(false)' },
         { text: 'Hide Private', link: 'javascript:hidePrivate(true)' },
      ];
      break;
      case 'ApexTrigger':
      contexts = [ 
         { text: 'Definition', link: '#definition' },
         { text: 'Statistics', link: '#stats' }
      ];
   }
   
   for (let ctx of contexts) {
      ret += options.fn(ctx);
   }
   return ret;
})

Handlebars.registerHelper('hierarchy', (name: string, group: IRGroup):object[] => {
   const ret:object[] = [];
   let hname:string|undefined = name;
   logger.info(`Calculating hierarchy of ${name}`);
   ret.push({name: hname, documented: true});
   while (hname) {
      const ir:IR|undefined = group.getTree(hname);
      if (ir) {
         const base:ApexTypeIR|undefined = (ir as ApexClassIR).baseClass;
         if (base) {
            logger.info(`Base class of ${hname}: ${base.name}`);
            hname = base.name;
            ret.push({name: hname, documented: group.getTree(hname)});
         } else {
            ret.push({name: 'Base Apex Object', documented: false});
            hname = undefined;
         }
      } else {
         ret.push({name: '...', documented: false});
         ret.push({name: 'Base Apex Object', documented: false});
         hname = undefined;
      }
   }
   return ret;
});

Handlebars.registerHelper('indent', (num: number):string => {
   return '&nbsp;'.repeat(num);
});

Handlebars.registerHelper('cond', function (v1, operator, v2) {
   
   switch (operator) {
      case '==':
      return (v1 == v2);
      case '===':
      return (v1 === v2);
      case '!=':
      return (v1 != v2);
      case '!==':
      return (v1 !== v2);
      case '<':
      return (v1 < v2);
      case '<=':
      return (v1 <= v2);
      case '>':
      return (v1 > v2);
      case '>=':
      return (v1 >= v2);
      case '&&':
      return (v1 && v2);
      case '||':
      return (v1 || v2);
      default:
      return false;
   }
});
Handlebars.registerHelper('triggerOnString', (ir:ApexTriggerIR) => {
   let ret = [];
   ir.beforeInsert && ret.push('before insert');
   ir.beforeUpdate && ret.push('before update');
   ir.beforeDelete && ret.push('before delete');
   ir.beforeUndelete && ret.push('before undelete');
   ir.afterInsert && ret.push('after insert');
   ir.afterUpdate && ret.push('after update');
   ir.afterDelete && ret.push('after delete');
   ir.afterUndelete && ret.push('after undelete');
   return ret.join(', ');

})
}

export default registerHelpers;