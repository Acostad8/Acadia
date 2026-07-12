import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSchedulePdf } from "../src/lib/schedule-parser/parser";

async function main() {
  const pdfPath = resolve(process.argv[2] ?? "docs/horario.pdf");
  const data = new Uint8Array(readFileSync(pdfPath));
  const result = await parseSchedulePdf(data);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
