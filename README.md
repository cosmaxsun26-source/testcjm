# OTC Development Tracker

미국 OTC 선케어 제품 개발 프로세스 관리 시스템

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

- 제품 등록/수정/삭제 (CRUD)
- 20단계 프로세스 상태 관리 (개발 > 시험생산 > 양산/출고)
- 단계별 파일 업로드 (업로드 시 자동 완료 처리)
- 메인 목록에서 팀/자차/담당 정렬
- 핵심 4단계 (랩배치CT, 방부력, TMV/TMT, 시험제조) 완료 라이트 표시

## 기술 스택

- Next.js 16 + TypeScript
- Prisma 7 + SQLite
- Tailwind CSS 4
