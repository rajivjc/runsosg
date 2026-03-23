#!/bin/bash
# Phase B verification — run after Prompts 3-5 are deployed

set -e

echo "=== Phase B Timezone/Locale Migration Verification ==="
echo ""

# 1. Check for hardcoded values
echo "1. Checking for hardcoded timezone/locale values..."
VIOLATIONS=$(grep -rn "'Asia/Singapore'\|\"Asia/Singapore\"\|'en-SG'\|\"en-SG\"\|+08:00" src/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|.test.\|.spec.\|__tests__" \
  | grep -v "club\.ts\|ClubConfigProvider\|ClubSettingsForm\|settings/actions\.ts" \
  | grep -v "// \|/\*\| \*" \
  | grep -v "= 'Asia/Singapore'\|= 'en-SG'\|?? 'Asia/Singapore'\|?? 'en-SG'" \
  | grep -v '= "Asia/Singapore"\|= "en-SG"\|?? "Asia/Singapore"\|?? "en-SG"' \
  || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Found hardcoded references:"
  echo "$VIOLATIONS"
  echo ""
  echo "These need to be migrated to dynamic values."
  exit 1
else
  echo "✅ No hardcoded timezone/locale values found"
fi

echo ""

# 2. Check ClubConfigProvider exists and is wired
echo "2. Checking ClubConfigProvider..."
if grep -q "ClubConfigProvider" src/app/layout.tsx; then
  echo "✅ ClubConfigProvider is in root layout"
else
  echo "❌ ClubConfigProvider is NOT in root layout"
  exit 1
fi

echo ""

# 3. Check new date helpers exist
echo "3. Checking timezone helpers in dates.ts..."
for fn in "nowInTimezone" "todayInTimezone" "dateOnlyToDate" "getUtcOffset" "formatDateInTimezone"; do
  if grep -q "export function $fn\|export const $fn" src/lib/utils/dates.ts; then
    echo "  ✅ $fn exists"
  else
    echo "  ❌ $fn is MISSING"
    exit 1
  fi
done

echo ""

# 4. Check guard rail test exists
echo "4. Checking guard rail test..."
if [ -f "tests/unit/timezone-guard.spec.ts" ]; then
  echo "✅ Guard rail test exists"
else
  echo "❌ Guard rail test is MISSING"
  exit 1
fi

echo ""

# 5. Type check
echo "5. Running type check..."
npx tsc --noEmit
echo "✅ Type check passed"

echo ""

# 6. Run guard rail test
echo "6. Running timezone guard rail test..."
npx jest timezone-guard --passWithNoTests
echo "✅ Guard rail test passed"

echo ""
echo "=== Phase B Verification Complete ✅ ==="
