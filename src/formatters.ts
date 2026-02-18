import chalk from 'chalk';
import type { UsageState } from './state.js';
import type { Config } from './config.js';

type Format = 'text' | 'json' | 'html';

// ─── Currency Helpers ────────────────────────────────────────────

function toEur(usd: number, config: Config): number {
  return usd * config.usdToEur;
}

function formatEur(usd: number, config: Config): string {
  return `€${toEur(usd, config).toFixed(2)}`;
}

function formatEurBudget(usd: number, config: Config): string {
  return `€${toEur(usd, config).toFixed(0)}`;
}

function formatDual(usd: number, config: Config): string {
  return `$${usd.toFixed(2)} (€${toEur(usd, config).toFixed(2)})`;
}

function formatDualBudget(usd: number, config: Config): string {
  return `$${usd.toFixed(0)} (€${toEur(usd, config).toFixed(0)})`;
}

// ─── Text Formatter ──────────────────────────────────────────────

function formatText(state: UsageState, config: Config): string {
  const lines: string[] = [];
  const prot = state.protection_mode;
  const protIcon = prot ? '🛡️  ACTIVE' : '✅ OFF';

  lines.push(chalk.bold('🔴 Claude Usage Report'));
  lines.push('─'.repeat(45));

  // Protection mode
  lines.push(`Protection mode: ${prot ? chalk.red(protIcon) : chalk.green(protIcon)}`);
  lines.push('');

  // Current week
  lines.push(chalk.bold('📊 Current Week'));
  lines.push(`  Period: ${state.current_week.start_date} → ${state.current_week.end_date}`);
  lines.push(`  Total:  ${colorCostDual(state.current_week.total_cost, config)} / ${formatDualBudget(config.weeklyBudget, config)}`);
  lines.push(`  Budget: ${colorPct(state.current_week.pct || '0')}%`);
  lines.push(`  Proj:   ${colorProjectionDual(state.current_week.projection, config)}`);
  lines.push('');

  // Recent days
  lines.push(chalk.bold('📅 Recent Days'));
  lines.push(`  J-1 (${state.yesterday.date}):  ${formatDual(state.yesterday.cost, config)}`);
  lines.push(`  J-2 (${state.day_before.date}):  ${formatDual(state.day_before.cost, config)}`);
  lines.push(`  J-3 (${state.three_days_ago.date}):  ${formatDual(state.three_days_ago.cost, config)}`);
  lines.push('');

  // 7-day stats
  lines.push(chalk.bold('📈 7-Day Stats'));
  lines.push(`  Total:   ${formatDual(state.last_7_days.total, config)}`);
  lines.push(`  Avg/day: ${formatDual(state.last_7_days.avg_daily, config)}`);
  lines.push('');

  // Alerts
  if (state.alerts.length > 0) {
    lines.push(chalk.bold.yellow('⚠️  Alerts'));
    for (const a of state.alerts) {
      lines.push(`  • ${a}`);
    }
    lines.push('');
  }

  // 7-day detail
  if (state.daily_costs_7d && state.daily_costs_7d.length > 0) {
    lines.push('');
    lines.push(formatSevenDaysDetail(state, config));
  }

  // Last check
  const lastCheck = state.lastCheck
    ? new Date(state.lastCheck).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
    : 'never';
  lines.push('');
  lines.push(chalk.dim(`Last check: ${lastCheck}`));

  return lines.join('\n');
}

function colorCostDual(costUsd: number, config: Config): string {
  const pct = (costUsd / config.weeklyBudget) * 100;
  const str = formatDual(costUsd, config);
  if (pct >= 80) return chalk.red.bold(str);
  if (pct >= 50) return chalk.yellow(str);
  return chalk.green(str);
}

function colorPct(pct: string): string {
  const n = parseFloat(pct);
  if (n >= 80) return chalk.red.bold(pct);
  if (n >= 50) return chalk.yellow(pct);
  return chalk.green(pct);
}

function colorProjectionDual(projUsd: number, config: Config): string {
  const str = formatDual(projUsd, config);
  if (projUsd > config.weeklyBudget) return chalk.red.bold(str + ' ⚠️');
  if (projUsd > config.weeklyBudget * 0.8) return chalk.yellow(str);
  return chalk.green(str);
}

// ─── JSON Formatter ──────────────────────────────────────────────

function formatJson(state: UsageState, _config: Config): string {
  return JSON.stringify(state, null, 2);
}

// ─── HTML Formatter (for email briefings) ────────────────────────

function formatHtml(state: UsageState, config: Config): string {
  const prot = state.protection_mode;
  const protBadge = prot
    ? '<span style="color:#dc3545;font-weight:bold">🛡️ ACTIVE</span>'
    : '<span style="color:#28a745">✅ OFF</span>';

  const pct = parseFloat(state.current_week.pct || '0');
  const costColor = pct >= 80 ? '#dc3545' : pct >= 50 ? '#ffc107' : '#28a745';
  const projColor = state.current_week.projection > config.weeklyBudget ? '#dc3545' : '#28a745';

  return `<div style="font-family:system-ui,sans-serif;max-width:500px">
  <h3 style="margin-bottom:8px">🔴 Claude Usage</h3>
  <p>Protection: ${protBadge}</p>
  <table style="border-collapse:collapse;width:100%">
    <tr>
      <td style="padding:4px 12px 4px 0"><strong>Week total</strong></td>
      <td style="padding:4px 0;color:${costColor};font-weight:bold">${formatEur(state.current_week.total_cost, config)} / ${formatEurBudget(config.weeklyBudget, config)} (${state.current_week.pct}%)</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0"><strong>Projection</strong></td>
      <td style="padding:4px 0;color:${projColor}">${formatEur(state.current_week.projection, config)}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0"><strong>J-1</strong> (${state.yesterday.date})</td>
      <td style="padding:4px 0">${formatEur(state.yesterday.cost, config)}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0"><strong>J-2</strong> (${state.day_before.date})</td>
      <td style="padding:4px 0">${formatEur(state.day_before.cost, config)}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0"><strong>J-3</strong> (${state.three_days_ago.date})</td>
      <td style="padding:4px 0">${formatEur(state.three_days_ago.cost, config)}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0"><strong>7-day avg</strong></td>
      <td style="padding:4px 0">${formatEur(state.last_7_days.avg_daily, config)}/day</td>
    </tr>
  </table>
  ${state.alerts.length > 0 ? `<p style="color:#dc3545;margin-top:8px"><strong>⚠️ Alerts:</strong> ${state.alerts.join(' | ')}</p>` : ''}
</div>`;
}

// ─── Dispatcher ──────────────────────────────────────────────────

export function formatReport(state: UsageState, config: Config, format: Format): string {
  switch (format) {
    case 'json': return formatJson(state, config);
    case 'html': return formatHtml(state, config);
    case 'text':
    default:     return formatText(state, config);
  }
}

// ─── Week Summary (compact) ──────────────────────────────────────

export function formatWeekSummary(state: UsageState, config: Config): string {
  const lines: string[] = [];
  lines.push(chalk.bold('📊 Current Week'));
  lines.push(`  Period:     ${state.current_week.start_date} → ${state.current_week.end_date}`);
  lines.push(`  Total:      ${colorCostDual(state.current_week.total_cost, config)} / ${formatDualBudget(config.weeklyBudget, config)}`);
  lines.push(`  Budget:     ${colorPct(state.current_week.pct || '0')}%`);
  lines.push(`  Projection: ${colorProjectionDual(state.current_week.projection, config)}`);
  lines.push(`  Protection: ${state.protection_mode ? chalk.red('🛡️  ACTIVE') : chalk.green('✅ OFF')}`);
  return lines.join('\n');
}

// ─── Daily Breakdown ─────────────────────────────────────────────

export function formatDailyBreakdown(state: UsageState, config: Config): string {
  const lines: string[] = [];
  lines.push(chalk.bold('📅 Daily Breakdown'));
  lines.push('');

  const days = [
    { label: 'J-1', ...state.yesterday },
    { label: 'J-2', ...state.day_before },
    { label: 'J-3', ...state.three_days_ago },
  ];

  for (const d of days) {
    const bar = makeBar(d.cost, config.weeklyBudget / 7);
    lines.push(`  ${d.label} (${d.date}): ${formatDual(d.cost, config)} ${bar}`);
  }

  lines.push('');
  lines.push(`  7-day total: ${formatDual(state.last_7_days.total, config)}`);
  lines.push(`  7-day avg:   ${formatDual(state.last_7_days.avg_daily, config)}/day`);
  lines.push(`  Daily budget: ${formatDual(config.weeklyBudget / 7, config)}/day`);

  return lines.join('\n');
}

function makeBar(value: number, target: number): string {
  const ratio = Math.min(value / target, 2);
  const width = Math.round(ratio * 20);
  const filled = '█'.repeat(width);
  const empty = '░'.repeat(Math.max(20 - width, 0));
  const color = ratio >= 1.5 ? chalk.red : ratio >= 1 ? chalk.yellow : chalk.green;
  return color(filled + empty);
}

// ─── Protection Status ───────────────────────────────────────────

export function formatProtectionStatus(status: {
  enabled: boolean;
  reason: string;
  weekTotal: number;
  weeklyBudget: number;
  weekPct: string;
  lastCheck: string;
}, config: Config): string {
  const lines: string[] = [];
  lines.push(chalk.bold('🛡️  Protection Mode'));
  lines.push(`  Status:  ${status.enabled ? chalk.red.bold('ACTIVE') : chalk.green('OFF')}`);
  lines.push(`  Reason:  ${status.reason}`);
  lines.push(`  Budget:  ${formatEur(status.weekTotal, config)}/${formatEurBudget(status.weeklyBudget, config)} (${status.weekPct}%)`);
  lines.push(`  Checked: ${status.lastCheck}`);
  return lines.join('\n');
}

// ─── 7-Day Detail (Tokens + Cost) ────────────────────────────────

export function formatSevenDaysDetail(state: UsageState, config: Config): string {
  const lines: string[] = [];
  lines.push(chalk.bold('📊 7-Day Detail (Tokens + Cost)'));
  lines.push('');

  const days = state.daily_costs_7d || [];
  if (days.length === 0) {
    lines.push(chalk.dim('  No data available'));
    return lines.join('\n');
  }

  // Sort by date descending (most recent first)
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));

  // Table header
  lines.push(chalk.dim('  Date         Tokens In   Tokens Out            Cost (USD + EUR)'));
  lines.push(chalk.dim('  ───────────  ──────────  ───────────  ──────────────────────'));

  for (const day of sorted.slice(0, 7)) {
    const tokensIn = (day.tokens_input || 0).toLocaleString('en-US').padStart(10);
    const tokensOut = (day.tokens_output || 0).toLocaleString('en-US').padStart(11);
    const costDual = formatDual(day.cost, config).padStart(22);
    
    const costColor = day.cost > config.weeklyBudget / 7 ? chalk.yellow : chalk.white;
    
    lines.push(`  ${day.date}  ${chalk.cyan(tokensIn)}  ${chalk.magenta(tokensOut)}  ${costColor(costDual)}`);
  }

  lines.push('');
  const totalIn = days.reduce((s, d) => s + (d.tokens_input || 0), 0);
  const totalOut = days.reduce((s, d) => s + (d.tokens_output || 0), 0);
  const totalCost = days.reduce((s, d) => s + d.cost, 0);

  lines.push(chalk.dim('  TOTAL        ') +
    chalk.cyan(totalIn.toLocaleString('en-US').padStart(10)) + '  ' +
    chalk.magenta(totalOut.toLocaleString('en-US').padStart(11)) + '  ' +
    chalk.bold(formatDual(totalCost, config).padStart(22))
  );

  return lines.join('\n');
}
