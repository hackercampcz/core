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
    target: "node14.8",
    external: ["aws-sdk"],
    entryPoints: [entrypoint],
    banner: { js: format === "esm" ? requireShim : "" },
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
  return new pulumi.asset.AssetArchive({
    "index.js": new pulumi.asset.StringAsset(build(entrypoint, minify, format)),
  });
}
