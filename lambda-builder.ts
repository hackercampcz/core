import * as pulumi from "@pulumi/pulumi";
import { buildSync } from "esbuild";

const requireShim = `import module from 'module';
if (typeof globalThis.require == "undefined") globalThis.require = module.createRequire(import.meta.url);`;

function build(entrypoint: string, minify: boolean, format: "cjs" | "esm") {
  const result = buildSync({
    bundle: true,
    minify,
    format,
    charset: "utf8",
    platform: "node",
    target: "node16.14",
    mainFields: ["module", "main"],
    external: ["aws-sdk"],
    entryPoints: [entrypoint],
    banner: { js: format === "esm" ? requireShim : "" },
    treeShaking: true,
    write: false,
  });
  return result?.outputFiles?.[0].text ?? "";
}

export function buildCodeAsset(
  entrypoint: string,
  { minify, format }: { minify: boolean; format: "esm" | "cjs" } = {
    minify: false,
    format: "cjs",
  }
): pulumi.asset.AssetArchive {
  const ext = format === "esm" ? "mjs" : "js";
  return new pulumi.asset.AssetArchive({
    [`index.${ext}`]: new pulumi.asset.StringAsset(
      build(entrypoint, minify, format)
    ),
  });
}
