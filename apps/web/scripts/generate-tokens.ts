import { readFileSync, writeFileSync } from "node:fs";
import { renderThemeCss } from "../src/theme/token-contract.ts";

const destination = new URL("../src/styles/tokens.generated.css", import.meta.url);
const generated = renderThemeCss();
if (process.argv.includes("--check")) {
  const actual = readFileSync(destination, "utf8");
  if (actual !== generated) {
    console.error("Mira Mobile token snapshot has drifted from generated Web CSS.");
    process.exitCode = 1;
  } else {
    console.log("Mira Mobile semantic token CSS contract passed.");
  }
} else {
  writeFileSync(destination, generated);
  console.log("Mira Mobile Web semantic token CSS regenerated from pinned sources.");
}
