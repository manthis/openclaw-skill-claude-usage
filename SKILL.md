---
name: claude-usage
description: Monitor Claude API usage costs, weekly budget tracking, protection mode, and anomaly alerts. Use when checking Claude consumption, generating usage reports, managing protection mode, or running the heartbeat cost check. Triggers on keywords like "claude usage", "claude cost", "budget", "protection mode", "usage report", "consumption".
---

# Claude Usage Monitor

Track Claude API costs via the Anthropic Admin API proxy. Provides weekly budget monitoring, daily breakdown, projection, anomaly alerts, and automatic protection mode.

## Quick Reference

```bash
# Run from skill directory
SKILL_DIR="{baseDir}"

# Check & update (heartbeat/cron) — calls the proxy, updates state
CLAUDE_USAGE_PROXY_TOKEN="..." node "$SKILL_DIR/dist/index.js" check

# Week summary (reads local state, no API call)
node "$SKILL_DIR/dist/index.js" week

# Daily breakdown
node "$SKILL_DIR/dist/index.js" daily

# Protection status
node "$SKILL_DIR/dist/index.js" protection

# Enable/disable protection manually
node "$SKILL_DIR/dist/index.js" protection --enable
node "$SKILL_DIR/dist/index.js" protection --disable

# Formatted report (text/json/html)
node "$SKILL_DIR/dist/index.js" report --format text
node "$SKILL_DIR/dist/index.js" report --format html
node "$SKILL_DIR/dist/index.js" report --format json
```

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `CLAUDE_USAGE_PROXY_TOKEN` | Yes (for `check`) | — |
| `CLAUDE_USAGE_PROXY_URL` | No | `https://claude-usage-proxy.onrender.com` |
| `CLAUDE_USAGE_STATE_FILE` | No | `~/.openclaw/workspace/memory/claude-usage-state.json` |
| `CLAUDE_USAGE_WEEKLY_BUDGET` | No | `625` |

## Commands

### `check` — Fetch & Update (API call)
Calls the proxy, computes metrics, updates `claude-usage-state.json`. Outputs JSON to stdout. Use in heartbeat/cron (max 2x/day to respect rate limits).

### `week` — Week Summary (local)
Shows current week total, budget %, projection, protection status. No API call.

### `daily` — Daily Breakdown (local)
Shows J-1/J-2/J-3 costs with progress bars and 7-day average.

### `report` — Formatted Report (local)
Generates full report. `--format html` for email briefings, `--format json` for piping.

### `protection` — Protection Mode (local)
Shows or toggles protection mode. When active: prefer Sonnet over Opus for non-critical tasks.

## Alert Thresholds

| Condition | Alert |
|-----------|-------|
| J-1 > 2× 7-day avg | `anomaly` |
| Week > 50% ($312.50) | `budget_50` + protection ON |
| Week > 80% ($500) | `budget_80` |
| Projection > $625 | `projection` |

## State File Format

Located at `~/.openclaw/workspace/memory/claude-usage-state.json`. Compatible with the legacy bash script format.

Key fields: `protection_mode` (bool), `current_week.total_cost`, `current_week.pct`, `yesterday.cost`, `alerts[]`.

## Heartbeat Integration

In HEARTBEAT.md, replace the bash script call with:

```bash
CLAUDE_USAGE_PROXY_TOKEN="..." node "{baseDir}/dist/index.js" check
```

To read state without an API call (e.g., for morning briefing):

```bash
node "{baseDir}/dist/index.js" report --format html
```

### Human-Readable Report

For a formatted, human-readable report with token usage:

```bash
claude-usage-report.sh
# or
~/bin/claude-usage-report.sh
```

The report includes:
- **Daily costs** (J-1, J-2, J-3) with individual token counts
- **Weekly totals** with aggregated token usage
- **USD + EUR** dual currency display
- **Protection mode** status
- **7-day averages**

This is ideal for quick status checks and daily monitoring.

