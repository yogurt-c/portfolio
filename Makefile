# ============================================================
# Portfolio Management — make targets
# 사용: make <target>
# ============================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help
.PHONY: help setup env install admin-pw db-push db-seed db-reset db dev build start lint clean nuke

help: ## 이 도움말 표시
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "  처음이면:  make setup  →  make admin-pw  →  make dev"

# ---------- 첫 셋업 ----------

setup: env install db ## 처음 한 번: .env 생성 + 의존성 설치 + DB 생성/시드
	@echo ""
	@echo "✓ 셋업 완료."
	@if ! grep -q '^ADMIN_PASSWORD_HASH="[^"]\+"' .env 2>/dev/null; then \
		echo "  → 다음: 'make admin-pw' 로 관리자 비밀번호 설정"; \
	fi
	@echo "  → 그 다음: 'make dev'"

env: ## .env 가 없으면 .env.example 복제 + SESSION_PASSWORD 자동 생성
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		SECRET=$$(openssl rand -base64 48 | tr -d '\n' | head -c 48); \
		if [ "$$(uname)" = "Darwin" ]; then \
			sed -i '' "s|^SESSION_PASSWORD=.*|SESSION_PASSWORD=\"$$SECRET\"|" .env; \
		else \
			sed -i "s|^SESSION_PASSWORD=.*|SESSION_PASSWORD=\"$$SECRET\"|" .env; \
		fi; \
		echo "✓ .env 생성 (SESSION_PASSWORD 자동 채움)"; \
	else \
		echo "✓ .env 가 이미 있음 — 건너뜀"; \
	fi

install: ## npm install
	npm install

admin-pw: ## 관리자 비밀번호 입력 받아 bcrypt 해시 후 .env 에 갱신
	@if [ ! -f .env ]; then echo "✗ .env 가 없습니다. 먼저 'make env'"; exit 1; fi
	@if [ ! -d node_modules ]; then echo "✗ node_modules 없음. 먼저 'make install'"; exit 1; fi
	@stty -echo 2>/dev/null; printf "새 관리자 비밀번호: " >&2; \
	read PW; \
	stty echo 2>/dev/null; echo "" >&2; \
	if [ -z "$$PW" ]; then echo "✗ 빈 비밀번호 불가"; exit 1; fi; \
	if [ $${#PW} -lt 4 ]; then echo "✗ 너무 짧습니다 (4자 이상)"; exit 1; fi; \
	HASH=$$(ADMIN_PW="$$PW" npx tsx scripts/hash-password.ts); \
	if [ -z "$$HASH" ]; then echo "✗ 해시 생성 실패"; exit 1; fi; \
	HASH_ESC=$$(printf '%s' "$$HASH" | sed 's/\$$/\\$$/g'); \
	grep -v '^ADMIN_PASSWORD_HASH=' .env > .env.tmp 2>/dev/null || true; \
	printf 'ADMIN_PASSWORD_HASH="%s"\n' "$$HASH_ESC" >> .env.tmp; \
	mv .env.tmp .env; \
	chmod 600 .env; \
	echo "✓ ADMIN_PASSWORD_HASH 갱신 완료"

# ---------- DB ----------

db: db-push db-seed ## 스키마 푸시 + 시드

db-push: ## Prisma 스키마를 Postgres 로 푸시
	npx prisma db push

db-seed: ## 샘플 프로젝트 6건 + 프로필 시드
	npm run db:seed

db-reset: ## Postgres 모든 데이터 삭제 후 푸시 + 재시드
	npx prisma db push --force-reset
	npm run db:seed

# ---------- 개발 / 빌드 ----------

dev: ## Next.js 개발 서버 (http://localhost:3000)
	npm run dev

build: ## 프로덕션 빌드 (prisma generate 포함)
	npm run build

start: ## 프로덕션 서버 (build 선행 필요)
	npm run start

lint: ## next lint
	npm run lint

# ---------- 정리 ----------

clean: ## 빌드 산출물 제거 (.next, tsbuildinfo)
	rm -rf .next *.tsbuildinfo

nuke: clean ## clean + node_modules 제거
	rm -rf node_modules
