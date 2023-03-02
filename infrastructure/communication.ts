import * as fs from "node:fs";
import * as path from "node:path";

const { marked } = require("marked");
const frontmatter = require("front-matter");

export function* readTemplates(relPath) {
  const communication = path.resolve(relPath);
  const templates = fs.readdirSync(communication);
  for (const template of templates) {
    const name = path.basename(template, ".md");
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
