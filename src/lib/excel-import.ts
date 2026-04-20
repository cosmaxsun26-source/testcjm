import * as XLSX from "xlsx";
import type { PrismaClient } from "@/generated/prisma";

export type ImportStatus = "pending" | "in_progress" | "completed" | "na";

export const SHEET_NAME = "OTC썬_24년";
export const HEADER_ROW = 5;
export const DATA_START_ROW = 6;

export const STEP_KEYS_IN_EXCEL_ORDER = [
  "clinical_trial", "unii_code", "preservative", "lab_batch_ct", "packaging_label",
  "tmv_tmt", "raw_material_qual", "trial_mfg", "bulk_shelf_life", "filling_packaging",
  "lab_stability", "drug_stability", "product_reg", "import_reg", "production_3batch",
  "validation_3batch", "drug_stability_2batch", "shipment",
];

export const ALL_STEP_KEYS = [
  "formulation_dev", "formulation_confirm", "active_ingredients",
  ...STEP_KEYS_IN_EXCEL_ORDER,
];

export type ParsedRow = {
  rowNo: number;
  excelNo: string | null;
  customer: string | null;
  productName: string | null;
  labNumber: string | null;
  bulkCode: string | null;
  bulkCodeName: string | null;
  monographCheck: string | null;
  uvFilterType: string | null;
  formulation: string | null;
  spf: string | null;
  broadSpectrum: string | null;
  waterResistant: string | null;
  container: string | null;
  volume: string | null;
  devTeam: string | null;
  formulator: string | null;
  salesManager: string | null;
  devNote: string | null;
  targetDate: string | null;
  devStatus: string | null;
  formulationConfirmed: string | null;
  activeIngredients: string | null;
  clinicalTrial: string | null;
  uniiCode: string | null;
  preservative: string | null;
  labBatchCT: string | null;
  primaryPackaging: string | null;
  tmvTmt: string | null;
  rawMaterialQual: string | null;
  trialMfg: string | null;
  bulkShelfLife: string | null;
  fillingPackaging: string | null;
  labStability: string | null;
  drugStability: string | null;
  productReg: string | null;
  importReg: string | null;
  production: string | null;
  validation: string | null;
  drugStability2: string | null;
  shipment: string | null;
  category: string;
  stepStatuses: Record<string, ImportStatus>;
  issues: string[];
  skipped: boolean;
};

export type ImportSummary = {
  total: number;
  importable: number;
  skipped: number;
  withIssues: number;
  byCategory: Record<string, number>;
  totalStatus: Record<ImportStatus, number>;
  duplicates: Array<{ currentRow: number; firstRow: number; excelNo: string | null; productName: string }>;
  preview: Array<{ rowNo: number; excelNo: string | null; category: string; productName: string; statusCounts: Record<ImportStatus, number> }>;
  skippedRows: Array<{ rowNo: number; issues: string[] }>;
};

function trimOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
}

function parseStatus(cell: string | null, devStatus: string | null): ImportStatus {
  if (cell === null) return "pending";
  const s = cell.toLowerCase();
  if (s.includes("완료") || s === "o") return "completed";
  if (devStatus?.toLowerCase() === "drop") return "na";
  if (s.includes("진행") || s.includes("중") || s.includes("예정")) return "in_progress";
  if (s === "x" || s === "해당없음" || s.includes("필요없음") || s.includes("불필요")) return "na";
  return "in_progress";
}

export function inferCategory(targetDate: string | null, devStatus: string | null): string {
  const hay = `${targetDate ?? ""} ${devStatus ?? ""}`.toLowerCase();
  if (/23년|24년|2023|2024|납품완료|drop/.test(hay)) return "24년사전확보";
  if (/25년|26년|2025|2026/.test(hay)) return "26년확보목표";
  return "26년확보목표";
}

export function inferProductType(formulation: string | null, container: string | null): string | null {
  if (container?.includes("스틱")) return "선스틱";
  if (formulation === "OD") return "선스틱";
  if (formulation === "OW" || formulation === "WO") return "선크림";
  return null;
}

function readRowFromSheet(ws: XLSX.WorkSheet, rowNo: number) {
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

function buildStepStatuses(row: ReturnType<typeof readRowFromSheet>): Record<string, ImportStatus> {
  const statuses: Record<string, ImportStatus> = {};
  const dev = row.devStatus;
  const devLower = dev?.toLowerCase() ?? "";
  const isDone = devLower.includes("납품완료") || devLower === "완료" || devLower.includes("시생산완료");
  const isInProgress = devLower.includes("개발중") || devLower.includes("처방확정") || devLower.includes("시생산예정") || devLower.includes("홀딩");
  const isDrop = devLower === "drop";

  const inferred: ImportStatus = isDrop ? "na" : isDone ? "completed" : isInProgress ? "in_progress" : "pending";
  statuses["formulation_dev"] = inferred;
  statuses["formulation_confirm"] = row.formulationConfirmed?.includes("확정")
    ? "completed"
    : row.formulationConfirmed?.includes("개발중")
      ? "in_progress"
      : inferred;
  statuses["active_ingredients"] = row.activeIngredients && inferred !== "na"
    ? (inferred === "pending" ? "in_progress" : inferred)
    : inferred;

  const fields: Array<keyof ReturnType<typeof readRowFromSheet>> = [
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

export function parseWorkbook(buffer: Buffer | Uint8Array): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet not found: ${SHEET_NAME}`);

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  const lastRow = range.e.r + 1;
  const rows: ParsedRow[] = [];

  for (let r = DATA_START_ROW; r <= lastRow; r++) {
    const raw = readRowFromSheet(ws, r);
    const issues: string[] = [];
    const skipped = !raw.productName;
    if (skipped) issues.push("productName missing");
    if (!raw.excelNo && !skipped) issues.push("NO missing");

    const category = inferCategory(raw.targetDate, raw.devStatus);
    const stepStatuses = skipped
      ? Object.fromEntries(ALL_STEP_KEYS.map((k) => [k, "pending" as ImportStatus]))
      : buildStepStatuses(raw);

    rows.push({
      rowNo: r,
      ...raw,
      category,
      stepStatuses,
      issues,
      skipped,
    });
  }

  return rows;
}

export function buildReport(rows: ParsedRow[]): ImportSummary {
  const importable = rows.filter((r) => !r.skipped);
  const byCategory: Record<string, number> = {};
  const totalStatus: ImportSummary["totalStatus"] = { pending: 0, in_progress: 0, completed: 0, na: 0 };

  for (const r of importable) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    for (const s of Object.values(r.stepStatuses)) totalStatus[s]++;
  }

  const seen = new Map<string, number>();
  const duplicates: ImportSummary["duplicates"] = [];
  for (const r of importable) {
    const key = `${r.excelNo ?? "?"}::${r.productName}`;
    const prev = seen.get(key);
    if (prev !== undefined) {
      duplicates.push({ currentRow: r.rowNo, firstRow: prev, excelNo: r.excelNo, productName: r.productName ?? "" });
    } else {
      seen.set(key, r.rowNo);
    }
  }

  const preview = importable.slice(0, 5).map((r) => {
    const counts: ImportSummary["totalStatus"] = { pending: 0, in_progress: 0, completed: 0, na: 0 };
    for (const s of Object.values(r.stepStatuses)) counts[s]++;
    return {
      rowNo: r.rowNo,
      excelNo: r.excelNo,
      category: r.category,
      productName: r.productName ?? "",
      statusCounts: counts,
    };
  });

  const skippedRows = rows
    .filter((r) => r.skipped)
    .map((r) => ({ rowNo: r.rowNo, issues: r.issues }));

  return {
    total: rows.length,
    importable: importable.length,
    skipped: rows.length - importable.length,
    withIssues: importable.filter((r) => r.issues.length > 0).length,
    byCategory,
    totalStatus,
    duplicates,
    preview,
    skippedRows,
  };
}

export async function insertRows(
  prisma: PrismaClient,
  rows: ParsedRow[],
  options: { truncate?: boolean } = {}
): Promise<{ inserted: number }> {
  if (options.truncate) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "StepHistory", "StepFile", "ProcessStep", "Product" RESTART IDENTITY CASCADE`
    );
  }

  const importable = rows.filter((r) => !r.skipped);
  const seen = new Set<string>();
  let inserted = 0;

  await prisma.$transaction(async (tx) => {
    for (const r of importable) {
      const key = `${r.excelNo ?? "?"}::${r.productName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const noInt = r.excelNo && /^\d+$/.test(r.excelNo) ? parseInt(r.excelNo, 10) : null;
      const productType = inferProductType(r.formulation, r.container);

      await tx.product.create({
        data: {
          no: noInt,
          category: r.category,
          customer: r.customer,
          productName: r.productName!,
          labNumber: r.labNumber,
          bulkCode: r.bulkCode,
          bulkCodeName: r.bulkCodeName,
          monographCheck: r.monographCheck,
          productType,
          uvFilterType: r.uvFilterType,
          formulation: r.formulation,
          spf: r.spf,
          broadSpectrum: r.broadSpectrum,
          waterResistant: r.waterResistant,
          container: r.container,
          volume: r.volume,
          devTeam: r.devTeam,
          formulator: r.formulator,
          salesManager: r.salesManager,
          devNote: r.devNote,
          targetDate: r.targetDate,
          devStatus: r.devStatus,
          formulationConfirmed: r.formulationConfirmed,
          activeIngredients: r.activeIngredients,
          clinicalTrial: r.clinicalTrial,
          uniiCode: r.uniiCode,
          preservative: r.preservative,
          labBatchCT: r.labBatchCT,
          primaryPackaging: r.primaryPackaging,
          tmvTmt: r.tmvTmt,
          rawMaterialQual: r.rawMaterialQual,
          trialMfg: r.trialMfg,
          bulkShelfLife: r.bulkShelfLife,
          fillingPackaging: r.fillingPackaging,
          labStability: r.labStability,
          drugStability: r.drugStability,
          productReg: r.productReg,
          importReg: r.importReg,
          production: r.production,
          validation: r.validation,
          drugStability2: r.drugStability2,
          shipment: r.shipment,
          steps: {
            create: ALL_STEP_KEYS.map((k) => ({
              stepKey: k,
              status: r.stepStatuses[k] ?? "pending",
            })),
          },
        },
      });
      inserted++;
    }
  }, { timeout: 120_000 });

  return { inserted };
}
