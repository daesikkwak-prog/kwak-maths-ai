#!/usr/bin/env bash
# .env.local의 값을 Vercel 프로젝트 환경변수로 등록한다.
# 사전 조건: npx vercel login 완료, npx vercel link 로 프로젝트 연결 완료
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "❌ .env.local이 없습니다."
  exit 1
fi

VARS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY)

for name in "${VARS[@]}"; do
  value=$(grep -E "^${name}=" .env.local | head -1 | cut -d= -f2- | tr -d '\r')

  if [ -z "$value" ]; then
    echo "⚠️  ${name}: .env.local에 값이 없어 건너뜁니다."
    continue
  fi

  for env in production preview development; do
    # 이미 등록돼 있으면 지우고 다시 넣는다 (값 변경 대응)
    npx vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | npx vercel env add "$name" "$env" >/dev/null
  done

  echo "✅ ${name} 등록 완료 (production/preview/development)"
done

echo ""
echo "다음: npx vercel --prod"
