import * as fs from "node:fs";
import * as path from "node:path";
import { marked } from "marked";
import type {TemplateInputs} from "./postmark";

const markdownExt = ".md";

const hooks = {
  preprocess(markdown) {
    // Let's make Postmark interpolation look like URL string, so it is converted to link as intended
    return markdown.replaceAll("{{ editUrl }}", "/{{editUrl}}/");
  },
  postprocess(html) {
    // Convert it back to Postmark interpolation string
    return html.replaceAll("/%7B%7BeditUrl%7D%7D/", "{{ editUrl }}");
  },
};
marked.use({ hooks });
const frontmatter = require("front-matter");

export function* readTemplates(relPath: string) : Generator<TemplateInputs> {
  const communication = path.resolve(relPath);
  const templates = fs.readdirSync(communication);
  for (const template of templates.filter(x => path.extname(x) === markdownExt)) {
    const name = path.basename(template, markdownExt);
    const filePath = path.resolve(communication, template);
    const content = fs.readFileSync(filePath, { encoding: "utf-8" });
    const { attributes, body } = frontmatter(content);
    const html = marked(body);
    yield Object.assign({}, attributes, {
      Name: name,
      Alias: `hc-${name}`,
      TextBody: body,
      HtmlBody: html,
    });
  }
}
