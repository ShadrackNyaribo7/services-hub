import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

const thirdPartyEnvPath = resolve(process.cwd(), "3party.env");

if (existsSync(thirdPartyEnvPath)) {
  loadEnvFile(thirdPartyEnvPath);
}

const require = createRequire(import.meta.url);
require("next/dist/bin/next");
