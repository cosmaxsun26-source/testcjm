import "dotenv/config";
import { readFileSync } from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

type Status = "pending" | "in_progress" | "completed" | "na";

type RowReport = {
  rowNo: number;
  excelNo: string | null;
  productName: string;
  customer: string | null;
  category: string;
  statusCounts: Record<Status, number>;
  issues: string[];
  skipped: boolean;
};

const SHEET_NAME = "OTC썬_24년";
const HEADER_ROW = 5;
const DATA_START_ROW = 6;

const STEP_KEYS_IN_EXCEL_ORDER = [
  "clinical_trial",      // W (23)
  "unii_code",           // X (24)
  "preservative",        // Y (25)
  "lab_batch_ct",        // Z (26)
  "packaging_label",     // AA (27)
  "tmv_tmt",             // AB (28)
  "raw_material_qual",   // AC (29)
  "trial_mfg",           // AD (30)
  "bulk_shelf_life",     // AE (31)
  "filling_packaging",   // AF (32)
  "lab_stability",       // AG (33)
  "drug_stability",      // AH (34)
  "product_reg",         // AI (35)
  "import_reg",          // AJ (36)
  "production_3batch",   // AK (37)
  "validation_3batch",   // AL (38)
  "drug_stability_2batch", // AM (39)
  "shipment",            // AN (40)
];

const ALL_STEP_KEYS = [
  "formulation_dev", "formulation_confirm", "active_ingredients",
  ...STEP_KEYS_IN_EXCEL_ORDER,
];

function trimOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
}

function parseStatus(cell: string | null, devStatus: string | null): Status {
  if (cell === null) return "pending";
  const s = cell.toLowerCase();
  if (s.includes("완료") || s === "o") return "completed";
  if (devStatus?.toLowerCase() === "drop") return "na";
  if (s.includes("진행") || s.includes("중") || s.includes("예정")) return "in_progress";
  if (s === "x" || s === "해당없음" || s.includes("필요없음") || s.includes("불필요")) return "na";
  // Any other non-empty text → treat as in_progress with note preserved
  return "in_progress";
}

function inferCategory(targetDate: string | null, devStatus: string | null): string {
  const hay = `${targetDate ?? ""} ${devStatus ?? ""}`.toLowerCase();
  // Note: Korean word boundaries don't work with \b, so we use substring matching.
  // Order matters: check 23/24/납품완료/drop first (24년사전확보 bucket) — those are "legacy"
  // items. Only classify as 26년확보목표 when the signal is explicitly 25/26년.
  if (/23년|24년|2023|2024|납품완료|drop/.test(hay)) return "24년사전확보";
  if (/25년|26년|2025|2026/.test(hay)) return "26년확보목표";
  return "26년확보목표";
}

function inferProductType(formulation: string | null, container: string | null): string | null {
  if (container?.includes("스틱")) return "선스틱";
  if (formulation === "OD") return "선스틱";
  if (formulation === "OW" || formulation === "WO") return "선크림";
  return null;
}

function readRow(ws: XLSX.WorkSheet, rowNo: number) {
  const get = (col: number) => {
    const addr = XLSX.utils.encode_cell({ r: rowNo - 1, c: col - 1 });
    const cell = ws[addr];
    return cell?.v;
  };
  return {
    excelNo: trimOrNull(get(1)),
    customer: trimOrNull(get(2)),
    productName: trimOrNull(get(3)),
    labNumber: trimOrNull(get(4)),
    bulkCode: trimOrNull(get(5)),
    bulkCodeName: trimOrNull(get(6)),
    monographCheck: trimOrNull(get(7)),
    uvFilterType: trimOrNull(get(8)),
    formulation: trimOrNull(get(9)),
    spf: trimOrNull(get(10)),
    broadSpectrum: trimOrNull(get(11)),
    waterResistant: trimOrNull(get(12)),
    container: trimOrNull(get(13)),
    volume: trimOrNull(get(14)),
    devTeam: trimOrNull(get(15)),
    formulator: trimOrNull(get(16)),
    salesManager: trimOrNull(get(17)),
    devNote: trimOrNull(get(18)),
    targetDate: trimOrNull(get(19)),
    devStatus: trimOrNull(get(20)),
    formulationConfirmed: trimOrNull(get(21)),
    activeIngredients: trimOrNull(get(22)),
    clinicalTrial: trimOrNull(get(23)),
    uniiCode: trimOrNull(get(24)),
    preservative: trimOrNull(get(25)),
    labBatchCT: trimOrNull(get(26)),
    primaryPackaging: trimOrNull(get(27)),
    tmvTmt: trimOrNull(get(28)),
    rawMaterialQual: trimOrNull(get(29)),
    trialMfg: trimOrNull(get(30)),
    bulkShelfLife: trimOrNull(get(31)),
    fillingPackaging: trimOrNull(get(32)),
    labStability: trimOrNull(get(33)),
    drugStability: trimOrNull(get(34)),
    productReg: trimOrNull(get(35)),
    importReg: trimOrNull(get(36)),
    production: trimOrNull(get(37)),
    validation: trimOrNull(get(38)),
    drugStability2: trimOrNull(get(39)),
    shipment: trimOrNull(get(40)),
  };
}

function buildStepStatuses(row: ReturnType<typeof readRow>): Record<string, Status> {
  const statuses: Record<string, Status> = {};
  const dev = row.devStatus;

  // First 3 steps are summary/meta fields without direct step column, infer from devStatus
  const devLower = dev?.toLowerCase() ?? "";
  const isDone = devLower.includes("납품완료") || devLower === "완료" || devLower.includes("시생산완료");
  const isInProgress = devLower.includes("개발중") || devLower.includes("처방확정") || devLower.includes("시생산예정") || devLower.includes("홀딩");
  const isDrop = devLower === "drop";

  const inferred: Status = isDrop ? "na" : isDone ? "completed" : isInProgress ? "in_progress" : "pending";
  // For the 3 meta steps, infer from devStatus / explicit confirmation fields only —
  // devNote/activeIngredients are free-form text, not status indicators.
  statuses["formulation_dev"] = inferred;
  statuses["formulation_confirm"] = row.formulationConfirmed?.includes("확정")
    ? "completed"
    : row.formulationConfirmed?.includes("개발중")
      ? "in_progress"
      : inferred;
  statuses["active_ingredients"] = row.activeIngredients && inferred !== "na"
    ? (inferred === "pending" ? "in_progress" : inferred)
    : inferred;

  // Step columns W~AN mapped to STEP_KEYS_IN_EXCEL_ORDER
  const fields: Array<keyof ReturnType<typeof readRow>> = [
    "clinicalTrial", "uniiCode", "preservative", "labBatchCT", "primaryPackaging",
    "tmvTmt", "rawMaterialQual", "trialMfg", "bulkShelfLife", "fillingPackaging",
    "labStability", "drugStability", "productReg", "importReg", "production",
    "validation", "drugStability2", "shipment",
  ];
  STEP_KEYS_IN_EXCEL_ORDER.forEach((key, i) => {
    const val = row[fields[i]] as string | null;
    statuses[key] = parseStatus(val, dev);
  });

  return statuses;
}

async function main() {
  const args = process.argv.slice(2);
  const xlsxPath = args.find((a) => !a.startsWith("--")) ?? "docs/excel-sample/master.xlsx";
  const dryRun = !args.includes("--commit");
  const truncate = args.includes("--truncate");

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const absPath = path.resolve(xlsxPath);
  console.log(`[import] file=${absPath}`);
  console.log(`[import] mode=${dryRun ? "DRY-RUN" : "COMMIT"}  truncate=${truncate}`);

  const wb = XLSX.read(readFileSync(absPath), { type: "buffer" });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet not found: ${SHEET_NAME}`);

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  const lastRow = range.e.r + 1;

  const reports: RowReport[] = [];

  for (let r = DATA_START_ROW; r <= lastRow; r++) {
    const row = readRow(ws, r);
    const report: RowReport = {
      rowNo: r,
      excelNo: row.excelNo,
      productName: row.productName ?? "",
      customer: row.customer,
      category: "",
      statusCounts: { pending: 0, in_progress: 0, completed: 0, na: 0 },
      issues: [],
      skipped: false,
    };

    if (!row.productName) {
      report.skipped = true;
      report.issues.push("productName missing");
      reports.push(report);
      continue;
    }
    if (!row.excelNo) {
      report.issues.push("NO missing - using row position");
    }

    report.category = inferCategory(row.targetDate, row.devStatus);
    const stepStatuses = buildStepStatuses(row);
    for (const s of Object.values(stepStatuses)) report.statusCounts[s]++;

    reports.push(report);
  }

  const total = reports.length;
  const skipped = reports.filter((r) => r.skipped).length;
  const importable = total - skipped;
  const withIssues = reports.filter((r) => r.issues.length > 0 && !r.skipped).length;

  console.log("");
  console.log(`=== SUMMARY ===`);
  console.log(`total rows scanned: ${total}`);
  console.log(`importable:         ${importable}`);
  console.log(`skipped (no name):  ${skipped}`);
  console.log(`with warnings:      ${withIssues}`);

  // Category distribution
  const byCategory: Record<string, number> = {};
  for (const r of reports) {
    if (r.skipped) continue;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }
  console.log(`by category:`, byCategory);

  // Status distribution (summed)
  const totalStatus: Record<Status, number> = { pending: 0, in_progress: 0, completed: 0, na: 0 };
  for (const r of reports) {
    if (r.skipped) continue;
    for (const k of Object.keys(r.statusCounts) as Status[]) {
      totalStatus[k] += r.statusCounts[k];
    }
  }
  console.log(`step statuses:`, totalStatus);

  // Duplicate detection by (excelNo, productName)
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const r of reports) {
    if (r.skipped) continue;
    const key = `${r.excelNo ?? "?"}::${r.productName}`;
    const prev = seen.get(key);
    if (prev !== undefined) {
      dupes.push(`  row ${r.rowNo} duplicates row ${prev}: NO=${r.excelNo} "${r.productName.slice(0, 40)}..."`);
    } else {
      seen.set(key, r.rowNo);
    }
  }
  if (dupes.length) {
    console.log(`\n=== ${dupes.length} duplicates (will be deduped by productName) ===`);
    for (const d of dupes.slice(0, 10)) console.log(d);
    if (dupes.length > 10) console.log(`  ...and ${dupes.length - 10} more`);
  }

  // Sample row preview
  console.log("\n=== FIRST 3 IMPORTABLE ROWS ===");
  const firstFew = reports.filter((r) => !r.skipped).slice(0, 3);
  for (const r of firstFew) {
    console.log(`  row ${r.rowNo}: NO=${r.excelNo} [${r.category}] "${r.productName.slice(0, 50)}" ` +
      `steps: c=${r.statusCounts.completed} ip=${r.statusCounts.in_progress} p=${r.statusCounts.pending} na=${r.statusCounts.na}`);
  }

  if (skipped > 0) {
    console.log(`\n=== ${skipped} SKIPPED ROWS ===`);
    for (const r of reports.filter((x) => x.skipped).slice(0, 5)) {
      console.log(`  row ${r.rowNo}: ${r.issues.join(", ")}`);
    }
  }

  if (dryRun) {
    console.log(`\n[dry-run] no database changes made. Re-run with --commit to insert.`);
    return;
  }

  // --- COMMIT MODE ---
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    if (truncate) {
      console.log(`\n[commit] truncating Product (cascades to steps/history)...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "StepHistory", "StepFile", "ProcessStep", "Product" RESTART IDENTITY CASCADE`);
    }

    let inserted = 0;
    const importedKeys = new Set<string>();
    await prisma.$transaction(async (tx) => {
      for (let r = DATA_START_ROW; r <= lastRow; r++) {
        const row = readRow(ws, r);
        if (!row.productName) continue;
        const key = `${row.excelNo ?? "?"}::${row.productName}`;
        if (importedKeys.has(key)) continue;
        importedKeys.add(key);

        const category = inferCategory(row.targetDate, row.devStatus);
        const noInt = row.excelNo && /^\d+$/.test(row.excelNo) ? parseInt(row.excelNo, 10) : null;
        const productType = inferProductType(row.formulation, row.container);
        const stepStatuses = buildStepStatuses(row);

        await tx.product.create({
          data: {
            no: noInt,
            category,
            customer: row.customer,
            productName: row.productName,
            labNumber: row.labNumber,
            bulkCode: row.bulkCode,
            bulkCodeName: row.bulkCodeName,
            monographCheck: row.monographCheck,
            productType,
            uvFilterType: row.uvFilterType,
            formulation: row.formulation,
            spf: row.spf,
            broadSpectrum: row.broadSpectrum,
            waterResistant: row.waterResistant,
            container: row.container,
            volume: row.volume,
            devTeam: row.devTeam,
            formulator: row.formulator,
            salesManager: row.salesManager,
            devNote: row.devNote,
            targetDate: row.targetDate,
            devStatus: row.devStatus,
            formulationConfirmed: row.formulationConfirmed,
            activeIngredients: row.activeIngredients,
            clinicalTrial: row.clinicalTrial,
            uniiCode: row.uniiCode,
            preservative: row.preservative,
            labBatchCT: row.labBatchCT,
            primaryPackaging: row.primaryPackaging,
            tmvTmt: row.tmvTmt,
            rawMaterialQual: row.rawMaterialQual,
            trialMfg: row.trialMfg,
            bulkShelfLife: row.bulkShelfLife,
            fillingPackaging: row.fillingPackaging,
            labStability: row.labStability,
            drugStability: row.drugStability,
            productReg: row.productReg,
            importReg: row.importReg,
            production: row.production,
            validation: row.validation,
            drugStability2: row.drugStability2,
            shipment: row.shipment,
            steps: {
              create: ALL_STEP_KEYS.map((k) => ({
                stepKey: k,
                status: stepStatuses[k] ?? "pending",
              })),
            },
          },
        });
        inserted++;
      }
    }, { timeout: 120_000 });

    console.log(`\n[commit] inserted ${inserted} products.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
