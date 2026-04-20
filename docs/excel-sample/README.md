# 엑셀 임포터 사용 가이드

## 파일 준비

팀의 마스터 엑셀(예: `SM랩 OTC 썬제품 개발 리스트 정리.xlsx`)을 이 디렉토리에
`master.xlsx` 이름으로 넣는다. 실제 파일은 `.gitignore` 처리되어 있어
저장소에는 올라가지 않는다.

## 엑셀 구조 요구사항

- 시트 이름: **`OTC썬_24년`**
- 헤더 행: **5번째 행**
- 데이터 시작: **6번째 행**
- 컬럼 A~AN (40개)이 현재 스키마와 매핑됨

주요 컬럼 매핑:

| Excel | DB 필드 | 비고 |
|---|---|---|
| A `NO` | `Product.no` | 숫자만 int로 저장, 비숫자("TP")는 null |
| B `고객사` | `Product.customer` | |
| C `제품명` | `Product.productName` | 비면 해당 row skip |
| D `확정 랩넘버` | `Product.labNumber` | |
| G `문안 확인` | `Product.monographCheck` | OTC 모노그래프 준수 플래그 |
| S `출시일/출시목표일` | `Product.targetDate` | category 추론의 근거 |
| T `개발 현황` | `Product.devStatus` | "납품완료/Drop/개발중/..." |
| W~AN (18개) | 프로세스 단계 | `ProcessStep.stepKey`/`status` 자동 매핑 |

## 카테고리 자동 분류

`Product.category`는 엑셀에 직접 없어서 **targetDate + devStatus 휴리스틱**으로 추론:
- "23년/24년/납품완료/Drop" 포함 → **24년사전확보**
- "25년/26년" 포함 → **26년확보목표**
- 둘 다 아니면 26년확보목표 (기본값)

## 스텝 상태 파서

각 단계 컬럼의 셀 텍스트를 4가지 상태로 매핑:
- 셀에 "완료" 또는 "O" → `completed`
- "진행중/중/예정" → `in_progress`
- "X/해당없음/필요없음" → `na`
- devStatus가 "Drop" → `na`
- 빈 셀/`-` → `pending`
- 그 외 자유 텍스트 → `in_progress` (리뷰 필요)

메타 단계 3개 (`formulation_dev`, `formulation_confirm`, `active_ingredients`) 는
전용 컬럼이 없어 `devStatus` 기반으로 유추한다 (납품완료→completed, 개발중→in_progress 등).

## 실행

```bash
# 기본 경로(docs/excel-sample/master.xlsx)에서 dry-run
npm run import:excel

# 다른 파일 경로 지정
npm run import:excel -- docs/excel-sample/other.xlsx

# 실제 반영 (append)
npm run import:excel -- --commit

# 기존 Product 전부 지우고 재임포트 (StepHistory / StepFile 까지 cascade)
npm run import:excel -- --commit --truncate
```

`--dry-run` (기본값)은 DB를 건드리지 않고 요약만 출력한다:
- 총 row / importable / skipped / warnings 수
- 카테고리 분포
- 스텝 상태 합계
- 중복 (NO+productName) 목록
- skipped된 row 이유

## 중복 정책

임포터는 `(NO, productName)` 조합 기준으로 dedup. 같은 NO가 여러 번 나오더라도
제품명이 다르면 별도 제품(예: 조선미녀 색상 3~12홋수)으로 취급. 완전히 같은 pair는
첫 번째만 insert하고 나머지는 skip.

## 알려진 한계

- Excel의 문자 정보만 읽는다 (셀 색/서식은 무시)
- uvFilterType에 "혼합/유무기/복합" 등 희귀 값이 섞여 들어올 수 있음 — 이 경우
  DB에 그대로 저장되지만 편집 UI의 드롭다운에는 안 뜸 (표시 자체는 정상)
- Step.dueDate는 엑셀에 전용 컬럼이 없어 채워지지 않는다 (지연 하이라이트 기능을
  쓰려면 수동 입력 필요)
