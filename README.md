# Portfolio Management

백엔드 개발자 포트폴리오 — Blueprint 무드.

## 스택

- **Next.js 15 App Router** + **TypeScript** + **React 19**
- **Prisma** + **PostgreSQL** (개발/배포 모두 Postgres. 로컬은 Docker 또는 Neon free tier)
- **Tiptap** — 프로젝트 상세 본문 리치 텍스트 에디터 (이미지 업로드/리사이즈/정렬)
- **@dnd-kit/sortable** — 관리자 목록 드래그 순서 변경
- **iron-session** — 비밀번호 게이트 쿠키 세션
- **Vercel Blob** — 이미지 스토리지
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
| `db-reset`   | Postgres 모든 데이터 삭제 + 다시 푸시 + 시드          |
| `lint`       | `next lint`                                           |
| `clean`      | 빌드 산출물 제거                                       |
| `nuke`       | `clean` + node_modules 제거                            |

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
| POST   | /api/upload              | 이미지 업로드 (auth, multipart) → `{ url }` |

## 이미지 저장소 (Vercel Blob)

썸네일 및 본문 이미지는 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) 에 저장되고, DB 에는 URL 만 들어간다.

1. Vercel 대시보드 → 프로젝트 → **Storage** → **Create Blob Store**
2. 발급된 토큰을 `.env` 에 추가:

   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
   ```

3. 로컬 개발에서도 동일 토큰 사용 가능 (동일 store 공유). 격리하려면 별도 store 를 만들어 토큰을 분리.

업로드 제약: 최대 4MB, MIME `image/jpeg|png|webp|gif|avif` 만 허용 (`src/lib/blob.ts`). 프로젝트 수정·삭제 시 더이상 참조되지 않는 blob 은 best-effort 로 자동 삭제된다 (`deleteOrphans`).

## 배포 (Vercel + Neon)

1. **Neon 가입**: https://neon.tech → 새 프로젝트 → 발급된 `DATABASE_URL` 복사
2. **Vercel Blob Store 생성**: Vercel 대시보드 → Storage → Create Blob → `BLOB_READ_WRITE_TOKEN` 복사
3. **로컬 `.env` 채우기**:
   - `DATABASE_URL` (Neon)
   - `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
   - `SESSION_PASSWORD` — `make env` 가 자동 생성
   - `ADMIN_PASSWORD_HASH` — `make admin-pw` 로 생성
4. **로컬 검증**: `make db` → `make dev` → 새 프로젝트 만들고 이미지 업로드 동작 확인
5. **GitHub 푸시**: `git init && git add . && git commit -m "init" && git remote add origin <repo> && git push -u origin main`
6. **Vercel 에서 import**: New Project → 해당 GitHub 레포 선택 → Next.js 자동 감지
7. **Vercel 환경변수 등록**: 위 4개 (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_PASSWORD`, `ADMIN_PASSWORD_HASH`)
8. **Deploy**. 첫 빌드 후 시드 데이터가 필요하면 로컬에서 `DATABASE_URL` 을 Neon URL 로 두고 `npm run db:seed` 1회 실행.
