import 'dotenv/config';
import { hash } from 'bcryptjs';
import { createRequire } from 'module';
import { PrismaPg } from '@prisma/adapter-pg';

const require = createRequire(import.meta.url);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient({ adapter });

const ALL_STEP_KEYS = [
  "formulation_dev", "formulation_confirm", "active_ingredients", "clinical_trial",
  "unii_code", "preservative", "lab_batch_ct", "packaging_label", "tmv_tmt",
  "raw_material_qual", "trial_mfg", "bulk_shelf_life", "filling_packaging",
  "lab_stability", "drug_stability",
  "product_reg", "import_reg", "production_3batch", "validation_3batch",
  "drug_stability_2batch", "shipment",
];

const products = [
  {
    no: 1, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic Aqua Luxe Sun SPF50",
    labNumber: "SLT240822AH01HSS01", bulkCode: "3COS82364110",
    bulkCodeName: "ORGANIC AQUA LUXE SUN SPF50(OTC)",
    productType: "선크림", uvFilterType: "유기", formulation: "OW",
    spf: "50", broadSpectrum: "O", waterResistant: "-",
    container: "튜브", volume: "40mL/70mL", devTeam: "SC1",
    formulator: "한승수", salesManager: "-",
    devNote: "아래 컨셉제외 동일 골격으로 진행중. 250521 처방결재 완료 / 시생산 진행만 하면 됨.",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "HMS, EHS, OCT, BMdBM",
    clinicalTrial: "Label SPF: 51.3, C.W: 377.1, UVA I/UV Ratio: 0.78 (선진-싸이닉)",
    tmvTmt: "TMT 완료 (SCINIC으로 진행완료)",
    fillingPackaging: "완료",
    labStability: "벌크: 2M 특이사항 없음, 충진품: 2M 특이사항 없음",
    drugStability: "KOTITI 진행 6/13 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "in_progress", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "completed", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 2, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic Gentle Sun SPF50",
    labNumber: "SLT250211AC04SYJ03", bulkCode: "3COS82365110",
    bulkCodeName: "ORGANIC GENTLE SUN SPF50(OTC)",
    productType: "선크림", uvFilterType: "유기", formulation: "OW",
    spf: "50", broadSpectrum: "O", waterResistant: "-",
    container: "튜브", volume: "40mL/70mL", devTeam: "SC1",
    formulator: "소영준",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "HMS, EHS, OCT, BMdBM",
    clinicalTrial: "Label SPF 50, C.W: 380.0, UVA I/UV ratio: 0.87 (HLK)",
    tmvTmt: "TMT 완료 SLT250211AC04SYJ03(의뢰일 3/11)",
    fillingPackaging: "완료",
    drugStability: "KOTITI 진행 6/13 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "pending", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "completed", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 3, category: "24년사전확보", customer: "24년사전확보",
    productName: "Mineral Moist Sun SPF50",
    labNumber: "SCR241118AA09YMY01", bulkCode: "3COS82366110",
    bulkCodeName: "MINERAL MOIST SUN SPF50(OTC)",
    productType: "선크림", uvFilterType: "무기", formulation: "WO",
    spf: "50", broadSpectrum: "O", waterResistant: "-",
    container: "튜브", volume: "40mL/70mL", devTeam: "SC1",
    formulator: "유미리",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "ZnO",
    clinicalTrial: "Label SPF 52.8, C.W: 373.7, UVA I/UV ratio: 0.79 (엘리드)",
    tmvTmt: "TMT 완료 (이즈앤트리로 진행완료)",
    fillingPackaging: "완료",
    drugStability: "KOTITI 진행 6/13 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "pending", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "completed", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 4, category: "24년사전확보", customer: "24년사전확보",
    productName: "Mineral Mirror Fit Sun SPF50",
    labNumber: "SLM250207AD02HJY02", bulkCode: "3COS82367110",
    bulkCodeName: "Mineral Mirror Fit Sun SPF50(OTC)",
    productType: "선크림", uvFilterType: "무기", formulation: "WO",
    spf: "50", broadSpectrum: "O", waterResistant: "-",
    container: "블로우", volume: "50ml", devTeam: "SC1",
    formulator: "홍재영",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "ZnO",
    clinicalTrial: "Label SPF 53.8, C.W: 370.3nm, UVA I/UV ratio: 0.74 (HLK)",
    tmvTmt: "TMT 완료",
    fillingPackaging: "완료",
    drugStability: "KOTITI 진행 6/17 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "pending", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "in_progress", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 5, category: "24년사전확보", customer: "24년사전확보",
    productName: "Double Shield Glass Fit Sun SPF60",
    labNumber: "SCR241118AA12KYJ01", bulkCode: "3COS82368110",
    bulkCodeName: "DOUBLE SHIELD GLASS FIT SUN SPF60(OTC)",
    productType: "선크림", uvFilterType: "혼용", formulation: "OW",
    spf: "60", broadSpectrum: "O", waterResistant: "-",
    container: "튜브", volume: "40mL/70mL", devTeam: "SC1",
    formulator: "강예지",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "HMS, EHS, OCT, ZnO",
    clinicalTrial: "Label SPF: 61.8, C.W: 372.0, UVA I/UV ratio 0.61 (선진)",
    tmvTmt: "TMT 완료",
    fillingPackaging: "완료",
    drugStability: "KOTITI 진행 6/23 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "pending", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "in_progress", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 6, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic Velvetick SPF50",
    labNumber: "SST241029AA03HJP01", bulkCode: "3COS82369110",
    bulkCodeName: "ORGANIC VELVETICK SPF50(OTC)",
    productType: "선스틱", uvFilterType: "유기", formulation: "OD",
    spf: "50", broadSpectrum: "O", waterResistant: "-",
    container: "스틱", volume: "20g/11g", devTeam: "SC2",
    formulator: "박현지",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "HMS, EHS, OCT, BMdBM",
    clinicalTrial: "Label SPF: 54.8, C.W: 373.6, UVA I/UV Ratio: 0.75 (선진)",
    tmvTmt: "TMT 완료",
    fillingPackaging: "완료",
    drugStability: "KOTITI 진행 6/12 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "pending", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "completed", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 7, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic Crystal Sun Stick SPF50",
    labNumber: "SST241003AC01GSH01", bulkCode: "3COS82370110",
    bulkCodeName: "ORGANIC CRYSTAL SUN STICK SPF50(OTC)",
    productType: "선스틱", uvFilterType: "유기", formulation: "OD",
    spf: "50", broadSpectrum: "O", waterResistant: "-",
    container: "스틱", volume: "19g", devTeam: "SC2",
    formulator: "곽수홍",
    targetDate: "25년7월", devStatus: "완료", formulationConfirmed: "확정",
    activeIngredients: "HMS, EHS, OCT, BMdBM",
    clinicalTrial: "Label SPF: 56.8, C.W: 371.6, UVA I/UV Ratio: 0.7 (선진)",
    tmvTmt: "TMT 완료",
    fillingPackaging: "완료",
    drugStability: "KOTITI 진행 6/23 접수",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "completed",
      lab_batch_ct: "completed", tmv_tmt: "completed",
      raw_material_qual: "pending", trial_mfg: "completed",
      bulk_shelf_life: "completed", filling_packaging: "completed",
      lab_stability: "completed", drug_stability: "in_progress",
      product_reg: "pending", import_reg: "pending",
      production_3batch: "pending", validation_3batch: "pending",
      drug_stability_2batch: "pending", shipment: "pending",
    },
  },
  {
    no: 8, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic Hydra Dive Sun SPF50",
    productType: "선크림", uvFilterType: "유기", devTeam: "SC1",
    formulator: "한승수",
    clinicalTrial: "Label SPF 50, C.W: 377.3, UVA I/UV ratio: 0.78 (HLK)",
    tmvTmt: "04/09 QC TMT 완료",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      unii_code: "completed", preservative: "pending",
      lab_batch_ct: "pending", tmv_tmt: "completed",
    },
  },
  {
    no: 9, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic All Day Sun SPF50",
    productType: "선크림", uvFilterType: "유기", devTeam: "SC1",
    formulator: "오민호",
    clinicalTrial: "LABEL SPF 50, C.W: 377.1, UVA I/UV ratio: 0.79 (HLK)",
    tmvTmt: "TMV/TMT 필요없음 (이즈앤트리로 진행완료)",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      tmv_tmt: "na",
    },
  },
  {
    no: 10, category: "24년사전확보", customer: "24년사전확보",
    productName: "Organic Sunblur SPF50",
    productType: "선크림", uvFilterType: "유기", devTeam: "SC1",
    formulator: "최유미",
    clinicalTrial: "Label SPF 54.3, C.W: 375.3, UVA I/UV ratio: 0.78 (엘리드)",
    tmvTmt: "KOTITI에서 QC로 TMT요청 6/12",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      tmv_tmt: "in_progress",
    },
  },
  {
    no: 11, category: "24년사전확보", customer: "24년사전확보",
    productName: "Double Shield Tinted Sun SPF40",
    productType: "선크림", uvFilterType: "혼용", devTeam: "SC1",
    formulator: "최종민",
    clinicalTrial: "Label SPF 43.2, C.W: 377.49, UVA I/UV ratio: 0.81 (엘리드)",
    tmvTmt: "고은세상 브라이트닝 업 선 플러스와 처방 동일, MV필요없음",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
      tmv_tmt: "na",
    },
  },
  {
    no: 12, category: "26년확보목표", customer: "26년확보목표",
    productName: "Ultimate Water Resistant Sunscreen",
    productType: "선크림", uvFilterType: "유기", formulation: "OW",
    broadSpectrum: "O", waterResistant: "O",
    container: "튜브", devTeam: "SC1",
    formulator: "오민호", salesManager: "권양수",
    targetDate: "26.4월", devStatus: "개발중", formulationConfirmed: "개발중",
    activeIngredients: "EHS, HMS, OCR, BMDBM",
    devNote: "260311 MV 진행중. 4월초 완료 예정.",
    stepStatuses: {
      formulation_dev: "in_progress", formulation_confirm: "in_progress",
      active_ingredients: "in_progress", clinical_trial: "in_progress",
    },
  },
  {
    no: 13, category: "26년확보목표", customer: "26년확보목표",
    productName: "OTC 지속내수 무기자차(가칭)",
    productType: "선크림", uvFilterType: "무기", formulation: "WO",
    broadSpectrum: "O", waterResistant: "O",
    container: "튜브", devTeam: "SC1",
    formulator: "유미리", salesManager: "권양수",
    targetDate: "26.4월", devStatus: "개발중", formulationConfirmed: "개발중",
    activeIngredients: "ZnO",
    devNote: "260311 시생산 및 DRUG STABILITY 필요없음.",
    stepStatuses: {
      formulation_dev: "in_progress", formulation_confirm: "in_progress",
      active_ingredients: "in_progress", clinical_trial: "in_progress",
      trial_mfg: "na", drug_stability: "na",
    },
  },
  {
    no: 14, category: "26년확보목표", customer: "26년확보목표",
    productName: "Water-fence Sun Stick",
    labNumber: "SKC250822AB01HJP01", bulkCode: "3COS82422110",
    bulkCodeName: "(자)워터펜스선스틱(OTC)(시생산)",
    productType: "선스틱", uvFilterType: "유기", formulation: "OD",
    broadSpectrum: "O", waterResistant: "O",
    container: "스틱", devTeam: "SC2",
    formulator: "박현지", salesManager: "권양수",
    targetDate: "26.4월", devStatus: "시생산 예정", formulationConfirmed: "확정",
    activeIngredients: "EHS, HMS, OCR, BMDBM",
    clinicalTrial: "SPF 59.3, Broad Spectrum Pass, 80min 지속내수",
    devNote: "26.4/13 처방결재 진행중",
    stepStatuses: {
      formulation_dev: "completed", formulation_confirm: "completed",
      active_ingredients: "completed", clinical_trial: "completed",
    },
  },
  {
    no: 15, category: "26년확보목표",
    productName: "무기자차 닥터나인틴 무기자차 (WO)",
    devTeam: "SC2", formulator: "최종민", salesManager: "권양수",
  },
  {
    no: 16, category: "26년확보목표",
    productName: "크림1 메디힐 마데카소사이드수분선세럼 베이스",
    devTeam: "SC1", formulator: "유미리", salesManager: "권양수",
  },
  {
    no: 17, category: "26년확보목표",
    productName: "크림2 클리오구달어성초진정수분선크림",
    devTeam: "SC2", formulator: "한승수", salesManager: "권양수",
  },
  {
    no: 18, category: "26년확보목표",
    productName: "크림3 프롬리에비건이지에프시카워터선앰플",
    devTeam: "SC1", formulator: "오민호", salesManager: "권양수",
  },
  {
    no: 19, category: "26년확보목표",
    productName: "유화스틱 (메디큐브)",
    devTeam: "SC3", salesManager: "권양수",
  },
  {
    no: 20, category: "26년확보목표",
    productName: "미스트",
    devTeam: "SC3", salesManager: "권양수",
  },
  {
    no: 21, category: "26년확보목표",
    productName: "OW톤업 (달바 OTC)",
    devTeam: "SC3", salesManager: "권양수",
  },
];

async function main() {
  console.log("Seeding database...");

  const adminEmail = (process.env.AUTH_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.AUTH_ADMIN_PASSWORD ?? "change-me-now";
  const adminName = process.env.AUTH_ADMIN_NAME ?? "관리자";

  await prisma.stepHistory.deleteMany();
  await prisma.processStep.deleteMany();
  await prisma.product.deleteMany();

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: await hash(adminPassword, 12),
      role: "admin",
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: await hash(adminPassword, 12),
      role: "admin",
    },
  });

  for (const p of products) {
    const { stepStatuses, ...productData } = p;

    const product = await prisma.product.create({
      data: {
        ...productData,
        steps: {
          create: ALL_STEP_KEYS.map((key) => ({
            stepKey: key,
            status: stepStatuses?.[key] || "pending",
          })),
        },
      },
    });

    console.log(`  Created: ${product.productName}`);
  }

  console.log(`  Admin user: ${adminEmail}`);
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
