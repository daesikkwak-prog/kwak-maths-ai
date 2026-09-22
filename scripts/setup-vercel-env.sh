#!/usr/bin/env bash
# .env.local의 값을 Vercel 프로젝트 환경변수로 등록한다.
# 사전 조건: npx vercel login, npx vercel link 완료
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "❌ .env.local이 없습니다."
  exit 1
fi

# NEXT_PUBLIC_*은 브라우저에 노출되는 값이므로 Config(평문),
# 서버 전용 키는 Secret으로 저장한다.
declare -A SENSITIVITY=(
  [NEXT_PUBLIC_SUPABASE_URL]=--no-sensitive
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]=--no-sensitive
  [SUPABASE_SERVICE_ROLE_KEY]=--sensitive
  [GEMINI_API_KEY]=--sensitive
  [GEMINI_MODEL]=--no-sensitive
)

# GEMINI_MODEL은 선택 항목 — .env.local에 없으면 건너뛰고 코드 기본값을 쓴다
for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY GEMINI_MODEL; do
  value=$(grep -E "^${name}=" .env.local | head -1 | cut -d= -f2- | tr -d '\r')

  if [ -z "$value" ]; then
    echo "⚠️  ${name}: .env.local에 값이 없어 건너뜁니다."
    continue
  fi

  npx vercel env add "$name" production,preview,development \
    --value "$value" "${SENSITIVITY[$name]}" --force --yes >/dev/null 2>&1

  echo "✅ ${name} 등록 완료"
done

echo ""
echo "등록 확인: npx vercel env ls"
echo "배포:      npx vercel --prod"
