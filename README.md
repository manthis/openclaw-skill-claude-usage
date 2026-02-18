# 💰 Claude Usage CLI

> Track your Claude API usage and costs in real-time with live currency conversion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

## ✨ Features

- 📊 **Real-time usage tracking** — Monitor your Claude API consumption and costs
- 💶 **Live currency conversion** — USD → EUR with live exchange rates (Frankfurter API)
- 🛡️ **Budget protection mode** — Auto-alerts when exceeding 50% of weekly budget
- 📈 **Detailed reports** — 7-day breakdown with tokens (input/output) and costs
- 🔔 **Proactive alerts** — iMessage notifications on errors (proxy down, API issues)
- 📅 **Weekly reset tracking** — Monday 21:00 Europe/Paris (configurable)
- 🎨 **Beautiful CLI output** — Color-coded stats with progress bars

## 📸 Screenshots

```bash
$ claude-usage report
🔴 Claude Usage Report
─────────────────────────────────────────────
Protection mode: ✅ OFF

📊 Current Week
  Period: 2026-02-16 → 2026-02-23
  Total:  $24.05 (€20.30) / $625 (€528)
  Budget: 3.8%
  Proj:   $84.17 (€71.06)

📅 Recent Days
  J-1 (2026-02-17):  $9.65 (€8.15)
  J-2 (2026-02-16):  $14.40 (€12.16)
  J-3 (2026-02-15):  $7.28 (€6.15)
```

```bash
$ claude-usage detail
📊 7-Day Detail (Tokens + Cost)

  Date         Tokens In   Tokens Out            Cost (USD + EUR)
  ───────────  ──────────  ───────────  ──────────────────────
  2026-02-17           0        2,023           $9.65 (€8.15)
  2026-02-16           0        2,978         $14.40 (€12.16)
  2026-02-15           0        1,540           $7.28 (€6.15)
  
  TOTAL                 0       19,463         $93.04 (€78.55)
```

## 🚀 Installation

### Prerequisites

- Node.js 20+
- npm or pnpm
- Claude API Admin key (for usage/cost reports)

### Global Install

```bash
npm install -g @manthis/claude-usage-cli
```

### Local Install

```bash
git clone https://github.com/manthis/claude-usage-cli.git
cd claude-usage-cli
npm install
npm run build
npm link  # Makes claude-usage available globally
```

## ⚙️ Configuration

### Environment Variables

```bash
# Required: Your Claude proxy URL (or direct API if self-hosted)
export CLAUDE_USAGE_PROXY_URL="https://your-proxy.com"
export CLAUDE_USAGE_PROXY_TOKEN="your-secure-token"

# Optional: Customize settings
export CLAUDE_USAGE_WEEKLY_BUDGET="625"  # Weekly budget in USD
export USD_TO_EUR="0.92"                 # Manual rate (auto-fetched if not set)
export CLAUDE_USAGE_STATE_FILE="$HOME/.claude-usage-state.json"

# Optional: iMessage alerts (requires imsg CLI)
export ALERT_PHONE_NUMBER="+1234567890"  # Phone number for error alerts
```

### Proxy Setup

This CLI requires a secure proxy to access Claude Admin API endpoints:

- `/v1/organizations/usage_report/messages` (tokens)
- `/v1/organizations/cost_report` (costs)

**Example proxy:** [hal9000-claude-usage-proxy](https://github.com/manthis/hal9000-claude-usage-proxy) (NestJS + TypeScript)

## 📖 Usage

### Commands

```bash
# Fetch latest data and update state (use in cron/heartbeat)
claude-usage check

# Show current week summary
claude-usage week

# Show daily breakdown (J-1, J-2, J-3)
claude-usage daily

# Show 7-day detail with tokens
claude-usage detail

# Generate full report (text/json/html)
claude-usage report
claude-usage report --format json
claude-usage report --format html  # Great for email briefings

# Protection mode status
claude-usage protection

# Manually toggle protection
claude-usage protection --enable
claude-usage protection --disable
```

### Example Workflows

**Daily briefing email:**
```bash
claude-usage report --format html > briefing.html
# Send via your email client
```

**Heartbeat monitoring (every hour):**
```bash
# In crontab or OpenClaw heartbeat:
0 * * * * claude-usage check
```

**Budget alerts:**
```bash
# Automatically alerts when >50% weekly budget
# Sends iMessage to configured number (requires send-imsg.sh)
```

## 🛡️ Protection Mode

When your weekly spending exceeds **50% of the configured budget**, protection mode activates automatically:

- 🚨 Alerts sent via iMessage (if configured)
- 🛑 Can be integrated with your LLM orchestrator to switch to cheaper models
- 📊 State tracked in `claude-usage-state.json`

**Weekly reset:** Monday 21:00 Europe/Paris (configurable in `src/config.ts`)

## 🏗️ Architecture

```
src/
├── index.ts          # CLI entry point (commander)
├── config.ts         # Configuration loader
├── proxy.ts          # API client (cost + usage reports)
├── state.ts          # State persistence (JSON)
├── calculations.ts   # Metrics, projections, alerts
├── formatters.ts     # Output formatters (text/json/html)
├── protection.ts     # Protection mode logic
└── tests/
    └── calculations.test.ts  # Unit tests (10/10 passing)
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Build
npm run build

# Lint
npm run lint
```

**Coverage:** 100% on core logic (calculations, alerts)

## 📊 State File Format

```json
{
  "lastCheck": 1771431316513,
  "protection_mode": false,
  "weekly_reset_day": "monday",
  "weekly_reset_hour": 21,
  "budget": {
    "weekly_limit": 625,
    "alert_threshold": 0.5
  },
  "current_week": {
    "start_date": "2026-02-16",
    "end_date": "2026-02-23",
    "total_cost": 24.0486,
    "projection": 84.1701,
    "pct": "3.8"
  },
  "daily_costs_7d": [
    { "date": "2026-02-17", "cost": 9.6483, "tokens_input": 0, "tokens_output": 2023 }
  ]
}
```

## 🌍 Currency Conversion

Live exchange rates fetched from [Frankfurter API](https://www.frankfurter.app/) (free, no API key required).

Fallback: `0.92 EUR/USD` if API unavailable.

## 🔒 Security

- ✅ No API keys hardcoded
- ✅ Secrets managed via environment variables
- ✅ Proxy handles authentication (JWT Bearer tokens)
- ✅ Rate limiting enforced server-side (20 req/min)
- ✅ Client trusts proxy — no local rate limiting

## 🤝 Contributing

Pull requests welcome! Please ensure:
- All tests pass (`npm test`)
- Code follows TypeScript best practices
- Commits are clear and descriptive

## 📄 License

MIT © [Maxime Auburtin](https://github.com/manthis)

## 💡 Inspiration

Built for [OpenClaw](https://github.com/openclaw/openclaw) — an AI agent framework that needed robust usage monitoring.

## 🙏 Credits

- **Frankfurter API** — Free currency exchange rates
- **Anthropic** — Claude API
- **Commander.js** — CLI framework
- **Chalk** — Terminal styling

---

**Made with ❤️ by [HAL9000](https://github.com/manthis) 🔴**
