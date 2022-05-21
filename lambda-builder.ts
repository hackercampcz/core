import * as pulumi from "@pulumi/pulumi";
import { buildSync } from "esbuild";

const REQUIRE_SHIM = `import module from 'module';
if (typeof globalThis.require == "undefined") globalThis.require = module.createRequire(import.meta.url);`;

function build(entrypoint: string, minify: boolean) {
  const result = buildSync({
    bundle: true,
    minify,
    format: "esm",
    charset: "utf8",
    platform: "node",
    target: "node14.8",
    external: ["aws-sdk"],
    entryPoints: [entrypoint],
    write: false,
    banner: {
      js: REQUIRE_SHIM,
    },
  });
  return result?.outputFiles?.[0].text ?? "";
}

export function buildCodeAsset(
  entrypoint: string,
  minify = false
): pulumi.asset.AssetArchive {
  return new pulumi.asset.AssetArchive({
    "index.mjs": new pulumi.asset.StringAsset(build(entrypoint, minify)),
  });
}
