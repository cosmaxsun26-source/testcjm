// OTC 개발 프로세스 단계 정의
export const PROCESS_PHASES = [
  {
    name: "개발 단계",
    duration: "~3개월",
    steps: [
      { key: "formulation_dev", label: "처방개발", team: "SC1,2팀" },
      { key: "formulation_confirm", label: "제형확정", team: "SC1,2팀" },
      { key: "active_ingredients", label: "주성분구성", team: "SC1,2팀" },
      { key: "clinical_trial", label: "임상", team: "SC1,2팀" },
      { key: "unii_code", label: "UNII CODE", team: "SC1,2팀" },
      { key: "preservative", label: "방부력", team: "효능평가팀" },
      { key: "lab_batch_ct", label: "랩배치 CT", team: "RA팀(w/제형팀)" },
      { key: "packaging_label", label: "1,2차포장/라벨", team: "마케팅/고객사" },
      { key: "tmv_tmt", label: "TMV/TMT", team: "미생물팀(T0,T2)" },
    ],
  },
  {
    name: "시험생산 단계",
    duration: "~3개월",
    steps: [
      { key: "raw_material_qual", label: "원료적격성평가", team: "포장재연구팀" },
      { key: "trial_mfg", label: "시험제조(1배치)", team: "분석팀/품질팀" },
      { key: "bulk_shelf_life", label: "벌크유효기간검증(BHS)", team: "품질팀" },
      { key: "filling_packaging", label: "충전/포장", team: "품질팀(PE)" },
      { key: "lab_stability", label: "랩 Stability(1배치)", team: "제형팀,미생물,분석" },
      { key: "drug_stability", label: "Drug Stability(1배치,외부)", team: "품질팀" },
    ],
  },
  {
    name: "양산/출고 단계",
    duration: "~8개월",
    steps: [
      { key: "product_reg", label: "제품등록", team: "품질팀(PE)" },
      { key: "import_reg", label: "Import등록", team: "품질팀" },
      { key: "production_3batch", label: "제품생산(3배치)", team: "품질팀(PE)" },
      { key: "validation_3batch", label: "밸리데이션(3배치)", team: "제형팀,미생물,분석" },
      { key: "drug_stability_2batch", label: "Drug Stability(2배치)", team: "품질팀" },
      { key: "shipment", label: "고객사 출고/출시", team: "품질팀" },
    ],
  },
] as const;

export const ALL_STEPS: { key: string; label: string; team: string }[] = PROCESS_PHASES.flatMap((phase) => [...phase.steps]);

export const STEP_STATUS_OPTIONS = [
  { value: "pending", label: "미진행", color: "bg-gray-200 text-gray-700" },
  { value: "in_progress", label: "진행중", color: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "완료", color: "bg-green-100 text-green-700" },
  { value: "na", label: "해당없음", color: "bg-gray-100 text-gray-400" },
] as const;

export const UV_FILTER_TYPES = ["유기", "무기", "혼용"] as const;
export const FORMULATION_TYPES = ["OW", "WO", "OD"] as const;
export const PRODUCT_TYPES = ["선크림", "선스틱"] as const;
export const CONTAINER_TYPES = ["튜브", "블로우", "스틱"] as const;
export const DEV_TEAMS = ["SC1", "SC2", "SC3"] as const;
export const CATEGORIES = ["24년사전확보", "26년확보목표"] as const;
