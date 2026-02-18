#!/bin/bash
# Claude Usage Report - Human-readable output with tokens

set -euo pipefail

STATE_FILE="$HOME/.openclaw/workspace/memory/claude-usage-state.json"

if [[ ! -f "$STATE_FILE" ]]; then
    echo "❌ State file not found. Run check-claude-usage.sh first."
    exit 1
fi

# Helper: format tokens
fmt_tokens() {
    local tok=$1
    if [[ $tok -eq 0 ]]; then
        echo "N/A"
    elif [[ $tok -lt 1000 ]]; then
        echo "${tok} tok"
    else
        echo "$(echo "scale=1; $tok / 1000" | bc)k"
    fi
}

# Helper: USD to EUR
to_eur() {
    echo "scale=2; $1 * 0.844" | bc
}

# Read all state in single jq call
STATE_DATA=$(jq '{
  j1_date: .yesterday.date,
  j1_cost: .yesterday.cost,
  j2_date: .day_before.date,
  j2_cost: .day_before.cost,
  j3_date: .three_days_ago.date,
  j3_cost: .three_days_ago.cost,
  week_start: .current_week.start_date,
  week_end: .current_week.end_date,
  week_total: .current_week.total_cost,
  week_pct: .current_week.pct,
  week_proj: .current_week.projection,
  budget: .budget.weekly_limit,
  avg_daily: .last_7_days.avg_daily,
  total_7d: .last_7_days.total,
  protection: .protection_mode,
  j1_tok: ([.daily_costs_7d[] | select(.date == .yesterday.date) | .tokens_output] | add // 0),
  j2_tok: ([.daily_costs_7d[] | select(.date == .day_before.date) | .tokens_output] | add // 0),
  j3_tok: ([.daily_costs_7d[] | select(.date == .three_days_ago.date) | .tokens_output] | add // 0)
}' "$STATE_FILE")

_v() { echo "$STATE_DATA" | jq -r ".$1"; }

J1_DATE=$(_v j1_date); J1_COST=$(_v j1_cost); J1_TOK=$(_v j1_tok)
J2_DATE=$(_v j2_date); J2_COST=$(_v j2_cost); J2_TOK=$(_v j2_tok)
J3_DATE=$(_v j3_date); J3_COST=$(_v j3_cost); J3_TOK=$(_v j3_tok)

WEEK_START=$(_v week_start); WEEK_END=$(_v week_end)
WEEK_TOTAL=$(_v week_total); WEEK_PCT=$(_v week_pct)
WEEK_PROJ=$(_v week_proj); BUDGET=$(_v budget)
WEEK_TOK=$(jq -r --arg start "$WEEK_START" --arg end "$WEEK_END" \
  '[.daily_costs_7d[] | select(.date >= $start and .date < $end) | .tokens_output] | add // 0' "$STATE_FILE")
AVG_DAILY=$(_v avg_daily); TOTAL_7D=$(_v total_7d)
PROTECTION=$(_v protection)

# Output
echo "📊 Consommation Claude"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💰 Coûts & Tokens récents:"
echo "  J-3 ($J3_DATE): \$$J3_COST (€$(to_eur "$J3_COST")) • $(fmt_tokens "$J3_TOK")"
echo "  J-2 ($J2_DATE): \$$J2_COST (€$(to_eur "$J2_COST")) • $(fmt_tokens "$J2_TOK")"
echo "  J-1 ($J1_DATE): \$$J1_COST (€$(to_eur "$J1_COST")) • $(fmt_tokens "$J1_TOK")"
echo ""
echo "📈 Semaine en cours ($WEEK_START → $WEEK_END):"
echo "  Total: \$$WEEK_TOTAL (€$(to_eur "$WEEK_TOTAL")) / \$$BUDGET (€$(to_eur "$BUDGET")) • $WEEK_PCT%"
echo "  Tokens: $(fmt_tokens "$WEEK_TOK")"
echo "  Projection: \$$WEEK_PROJ (€$(to_eur "$WEEK_PROJ"))"
echo ""
echo "📊 Moyenne 7 derniers jours:"
echo "  \$$AVG_DAILY (€$(to_eur "$AVG_DAILY")) / jour"
echo "  Total: \$$TOTAL_7D (€$(to_eur "$TOTAL_7D"))"
echo ""
if [[ "$PROTECTION" == "true" ]]; then
    echo "🛡️  Protection mode: ✅ ACTIVE"
else
    echo "🛡️  Protection mode: ❌ Inactive"
fi
