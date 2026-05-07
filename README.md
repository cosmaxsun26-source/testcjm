# OTC Development Tracker

미국 OTC 선케어 제품 개발 프로세스 관리 시스템

> 페이지 허브: [docs/index.html](./docs/index.html) — GitHub Pages 활성화 시 자동 배포.

## 사전 준비

- **Node.js 18 이상** 설치 필요: https://nodejs.org

## 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/cosmaxsun26-source/testcjm.git
cd testcjm

# 2. 패키지 설치 (Prisma 클라이언트도 자동 생성됨)
npm install

# 3. DB 생성 + 초기 데이터 입력
npm run db:setup

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 **http://localhost:3000** 접속

## 주요 기능

### 제품 관리
- 제품 등록/수정/삭제 (CRUD)
- 20단계 프로세스 상태 관리 (개발 → 시험생산 → 양산/출고)
- 단계별 파일 업로드 (업로드 시 자동 완료 처리)
- 목표일·기한일 월 단위 picker (`YYYY-MM` 포맷, 해당 월 말일까지 유예)
- 메인 목록 팀/자차/담당 정렬, 핵심 4단계 (랩배치CT, 방부력, TMV/TMT, 시험제조) 신호등 표시

### 대시보드 (`/dashboard`)
- 전체 진척률 도넛
- Phase Funnel: 개발 → 시험생산 → 양산·출고 → 출시 완료
- 출시 임박 TOP 5 (출고 phase + readiness 정렬)
- 카테고리 × Phase 매트릭스
- 고객사 TOP 8 (제품 수 + 완료율)
- 담당자별 부하 (in-progress / overdue)
- 7일 내 마감 임박, 지연 항목
- Drug Stability RED 제품

### Drug Stability (`/stability`)
- 적합 / 부적합 / 특이사항 결과 + 보라(지연) 4색 신호등 그리드
- 본생산 1차·2차 배치 분리, 배치 시작일 + 예상일 자동 계산
- Timepoint별 진척 + 노트 입력

### 관리자
- Excel 일괄 임포트 (`/admin/import`)
- 신규 제품 등록 (`/products/new`)

## 페이지 허브

[`docs/index.html`](./docs/index.html) — 의존성 없는 단일 HTML. GitHub Pages 활성화 시 자동 배포.

## 기술 스택

- Next.js 16 + TypeScript
- Prisma 7 + SQLite
- Tailwind CSS 4
- NextAuth (인증)

## 디렉터리

```
src/app/                  Next.js App Router 페이지
  ├─ page.tsx             제품 목록 (/)
  ├─ dashboard/           종합 분석
  ├─ stability/           Drug Stability
  ├─ products/[id]/       제품 상세
  ├─ admin/import/        Excel 임포트 (admin)
  └─ api/                 API 라우트
src/components/           재사용 UI
src/lib/                  상수 · 유틸 (overdue, stability-dates 등)
prisma/                   schema + seed
docs/                     정적 사이트 + 디자인 문서
```

## GitHub Pages 활성화

저장소 `Settings → Pages → Source` 에서 `Deploy from a branch` 선택, Branch는 `main` / `/docs`. 잠시 후 https://cosmaxsun26-source.github.io/testcjm/ 에서 허브 페이지 확인 가능.
