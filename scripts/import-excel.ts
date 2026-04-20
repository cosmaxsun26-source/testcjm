import "dotenv/config";
import { readFileSync } from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { parseWorkbook, buildReport, insertRows } from "../src/lib/excel-import";

async function main() {
  const args = process.argv.slice(2);
  const xlsxPath = args.find((a) => !a.startsWith("--")) ?? "docs/excel-sample/master.xlsx";
  const dryRun = !args.includes("--commit");
  const truncate = args.includes("--truncate");

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const absPath = path.resolve(xlsxPath);
  console.log(`[import] file=${absPath}`);
  console.log(`[import] mode=${dryRun ? "DRY-RUN" : "COMMIT"}  truncate=${truncate}`);

  const rows = parseWorkbook(readFileSync(absPath));
  const summary = buildReport(rows);

  console.log("");
  console.log(`=== SUMMARY ===`);
  console.log(`total rows scanned: ${summary.total}`);
  console.log(`importable:         ${summary.importable}`);
  console.log(`skipped (no name):  ${summary.skipped}`);
  console.log(`with warnings:      ${summary.withIssues}`);
  console.log(`by category:`, summary.byCategory);
  console.log(`step statuses:`, summary.totalStatus);

  if (summary.duplicates.length) {
    console.log(`\n=== ${summary.duplicates.length} duplicates (will be deduped by productName) ===`);
    for (const d of summary.duplicates.slice(0, 10)) {
      console.log(`  row ${d.currentRow} duplicates row ${d.firstRow}: NO=${d.excelNo} "${d.productName.slice(0, 40)}..."`);
    }
    if (summary.duplicates.length > 10) console.log(`  ...and ${summary.duplicates.length - 10} more`);
  }

  console.log("\n=== FIRST IMPORTABLE ROWS ===");
  for (const p of summary.preview) {
    console.log(`  row ${p.rowNo}: NO=${p.excelNo} [${p.category}] "${p.productName.slice(0, 50)}" ` +
      `steps: c=${p.statusCounts.completed} ip=${p.statusCounts.in_progress} p=${p.statusCounts.pending} na=${p.statusCounts.na}`);
  }

  if (summary.skipped > 0) {
    console.log(`\n=== ${summary.skipped} SKIPPED ROWS ===`);
    for (const r of summary.skippedRows.slice(0, 5)) {
      console.log(`  row ${r.rowNo}: ${r.issues.join(", ")}`);
    }
  }

  if (dryRun) {
    console.log(`\n[dry-run] no database changes made. Re-run with --commit to insert.`);
    return;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    if (truncate) console.log(`\n[commit] truncating Product...`);
    const result = await insertRows(prisma, rows, { truncate });
    console.log(`\n[commit] inserted ${result.inserted} products.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
