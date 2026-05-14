# Portfolio Management

백엔드 개발자 포트폴리오 — Blueprint 무드.

## 스택

- **Next.js 15 App Router** + **TypeScript** + **React 19**
- **Prisma** + **SQLite** (`DATABASE_URL`만 바꾸면 Postgres로 스왑 가능)
- **Tiptap** — 프로젝트 상세 본문 리치 텍스트 에디터
- **@dnd-kit/sortable** — 관리자 목록 드래그 순서 변경
- **iron-session** — 비밀번호 게이트 쿠키 세션
- **zod** — 입력 검증

## 빠른 시작

```bash
make setup        # .env 생성(SESSION_PASSWORD 자동) + npm install + db push + 시드
make admin-pw     # 관리자 비밀번호 입력 → bcrypt 해시로 .env 에 저장
make dev          # Next.js 개발 서버
```

http://localhost:3000 접속. 푸터 ⚙ → `make admin-pw` 에서 정한 비밀번호 입력.

전체 타깃은 `make` 또는 `make help`.

| target       | 설명                                                  |
|--------------|-------------------------------------------------------|
| `setup`      | 첫 1회: env + install + db                            |
| `admin-pw`   | 관리자 비밀번호 갱신 (bcrypt 해시로 저장)             |
| `dev`        | 개발 서버 (:3000)                                     |
| `build`      | 프로덕션 빌드                                          |
| `start`      | 빌드된 산출물로 서버 기동                              |
| `db`         | `db-push` + `db-seed`                                 |
| `db-reset`   | SQLite 파일 날리고 다시 푸시 + 시드                   |
| `lint`       | `next lint`                                           |
| `clean`      | 빌드 산출물 제거                                       |
| `nuke`       | `clean` + node_modules + SQLite 까지 전부 제거         |

## 관리자 진입

- 푸터 우측 ⚙ 아이콘 클릭
- 기본 비밀번호: `.env` 의 `ADMIN_PASSWORD` (기본값 `admin`)
- 관리자 메뉴: 프로젝트 추가/편집/삭제, 드래그 순서 변경, 프로필 편집

## 디자인 무드

프로토타입엔 Mono / Editorial / Blueprint 세 무드가 있었고, 이 구현은 **Blueprint 단일 무드**로 고정. CSS 토큰은 `src/styles/globals.css` 상단의 `:root` 변수에 모여 있어 색상·폰트만 바꾸면 다른 무드로 갈아끼울 수 있음.

## 디렉토리

```
src/
  app/
    page.tsx                       # 공개 페이지
    admin/                         # 관리자 (세션 가드)
    api/                           # REST 엔드포인트
  components/                      # 공개 페이지 컴포넌트
  components/admin/                # 관리자 컴포넌트
  lib/                             # db, session, validation
  styles/globals.css
prisma/
  schema.prisma                    # Project, Profile
  seed.ts
```

## API 엔드포인트

| Method | Path                     | 설명                          |
|--------|--------------------------|-------------------------------|
| GET    | /api/projects            | 목록 (position 오름차순)       |
| POST   | /api/projects            | 새 프로젝트 (auth)             |
| GET    | /api/projects/:id        | 단건                           |
| PUT    | /api/projects/:id        | 수정 (auth)                   |
| DELETE | /api/projects/:id        | 삭제 (auth)                   |
| PATCH  | /api/projects/order      | `{ order: [id, ...] }` (auth) |
| GET    | /api/profile             | 프로필                         |
| PUT    | /api/profile             | 프로필 수정 (auth)             |
| POST   | /api/auth/login          | `{ password }` → 세션 쿠키     |
| POST   | /api/auth/logout         | 세션 만료                      |
| GET    | /api/auth/me             | 200/401                       |

## Postgres 로 스왑

1. `prisma/schema.prisma` 의 `datasource db` 블록을 `provider = "postgresql"` 로 변경
2. `.env` 의 `DATABASE_URL` 을 `postgres://...` 로 변경
3. `npm run db:push` (또는 `prisma migrate dev`)
4. 시드: `npm run db:seed`

SQLite엔 배열 컬럼이 없어 `tags` / `links` 를 JSON 문자열로 저장하고 있음. Postgres로 가면 `Json` 또는 배열 타입으로 옮기는 게 깔끔하니, 스키마 변경 시 같이 처리 권장.
