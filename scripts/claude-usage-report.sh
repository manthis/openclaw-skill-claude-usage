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

# Read state
J1_DATE=$(jq -r '.yesterday.date' "$STATE_FILE")
J1_COST=$(jq -r '.yesterday.cost' "$STATE_FILE")
J1_TOK=$(jq -r '.daily_costs_7d[] | select(.date == "'$(jq -r '.yesterday.date' "$STATE_FILE")'") | .tokens_output // 0' "$STATE_FILE")

J2_DATE=$(jq -r '.day_before.date' "$STATE_FILE")
J2_COST=$(jq -r '.day_before.cost' "$STATE_FILE")
J2_TOK=$(jq -r '.daily_costs_7d[] | select(.date == "'$J2_DATE'") | .tokens_output // 0' "$STATE_FILE")

J3_DATE=$(jq -r '.three_days_ago.date' "$STATE_FILE")
J3_COST=$(jq -r '.three_days_ago.cost' "$STATE_FILE")
J3_TOK=$(jq -r '.daily_costs_7d[] | select(.date == "'$J3_DATE'") | .tokens_output // 0' "$STATE_FILE")

WEEK_START=$(jq -r '.current_week.start_date' "$STATE_FILE")
WEEK_END=$(jq -r '.current_week.end_date' "$STATE_FILE")
WEEK_TOTAL=$(jq -r '.current_week.total_cost' "$STATE_FILE")
WEEK_PCT=$(jq -r '.current_week.pct' "$STATE_FILE")
WEEK_PROJ=$(jq -r '.current_week.projection' "$STATE_FILE")
BUDGET=$(jq -r '.budget.weekly_limit' "$STATE_FILE")
WEEK_TOK=$(jq -r --arg start "$WEEK_START" --arg end "$WEEK_END" '[.daily_costs_7d[] | select(.date >= $start and .date < $end) | .tokens_output] | add // 0' "$STATE_FILE")

AVG_DAILY=$(jq -r '.last_7_days.avg_daily' "$STATE_FILE")
TOTAL_7D=$(jq -r '.last_7_days.total' "$STATE_FILE")

PROTECTION=$(jq -r '.protection_mode' "$STATE_FILE")

# Output
echo "📊 Consommation Claude"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💰 Coûts & Tokens récents:"
echo "  J-3 ($J3_DATE): \$$J3_COST (€$(to_eur $J3_COST)) • $(fmt_tokens $J3_TOK)"
echo "  J-2 ($J2_DATE): \$$J2_COST (€$(to_eur $J2_COST)) • $(fmt_tokens $J2_TOK)"
echo "  J-1 ($J1_DATE): \$$J1_COST (€$(to_eur $J1_COST)) • $(fmt_tokens $J1_TOK)"
echo ""
echo "📈 Semaine en cours ($WEEK_START → $WEEK_END):"
echo "  Total: \$$WEEK_TOTAL (€$(to_eur $WEEK_TOTAL)) / \$$BUDGET (€$(to_eur $BUDGET)) • $WEEK_PCT%"
echo "  Tokens: $(fmt_tokens $WEEK_TOK)"
echo "  Projection: \$$WEEK_PROJ (€$(to_eur $WEEK_PROJ))"
echo ""
echo "📊 Moyenne 7 derniers jours:"
echo "  \$$AVG_DAILY (€$(to_eur $AVG_DAILY)) / jour"
echo "  Total: \$$TOTAL_7D (€$(to_eur $TOTAL_7D))"
echo ""
if [[ "$PROTECTION" == "true" ]]; then
    echo "🛡️  Protection mode: ✅ ACTIVE"
else
    echo "🛡️  Protection mode: ❌ Inactive"
fi
