import type { DailyCost } from './proxy.js';
import type { Config } from './config.js';
import type { UsageState } from './state.js';

/** Get current date/time info in the configured timezone */
export function getDateInfo(config: Config) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    hour: 'numeric',
    hour12: false,
  });
  const dowFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    weekday: 'long',
  });

  const today = formatter.format(now);  // YYYY-MM-DD
  const hour = parseInt(hourFormatter.format(now), 10);
  const dow = dowFormatter.format(now).toLowerCase();

  // Day of week as number (1=Monday)
  const dowMap: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 7,
  };
  const dowNum = dowMap[dow] || 1;

  // Calculate relative dates
  const msDay = 86_400_000;
  const yesterday = formatDate(new Date(now.getTime() - msDay), config.timezone);
  const dayBefore = formatDate(new Date(now.getTime() - 2 * msDay), config.timezone);
  const threeDaysAgo = formatDate(new Date(now.getTime() - 3 * msDay), config.timezone);
  const sevenDaysAgo = formatDate(new Date(now.getTime() - 7 * msDay), config.timezone);
  const tomorrow = formatDate(new Date(now.getTime() + msDay), config.timezone);

  // Week start: most recent Monday that's already passed (considering reset hour)
  let daysBack = dowNum - 1;
  if (dowNum === 1 && hour < config.resetHour) {
    daysBack = 7;
  }
  const weekStart = formatDate(new Date(now.getTime() - daysBack * msDay), config.timezone);
  const weekEnd = formatDate(new Date(now.getTime() + (7 - daysBack) * msDay), config.timezone);

  return {
    today, hour, dow, dowNum,
    yesterday, dayBefore, threeDaysAgo, sevenDaysAgo, tomorrow,
    weekStart, weekEnd,
  };
}

function formatDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Find cost for a specific date in the daily costs array */
export function costForDate(days: DailyCost[], date: string): number {
  return days
    .filter((d) => d.date === date)
    .reduce((sum, d) => sum + d.cost, 0);
}

/** Compute all metrics from daily cost data */
/** Find day data for a specific date */
function dayForDate(days: DailyCost[], date: string): DailyCost | undefined {
  return days.find((d) => d.date === date);
}

export function computeMetrics(
  config: Config,
  days: DailyCost[],
  dates: ReturnType<typeof getDateInfo>,
) {
  const yData = dayForDate(days, dates.yesterday);
  const dbData = dayForDate(days, dates.dayBefore);
  const taData = dayForDate(days, dates.threeDaysAgo);

  const yCost = yData?.cost || 0;
  const dbCost = dbData?.cost || 0;
  const taCost = taData?.cost || 0;

  // Week total: dates >= weekStart
  const weekDays = days.filter((d) => d.date >= dates.weekStart);
  const weekTotal = weekDays.reduce((s, d) => s + d.cost, 0);
  const weekDayCount = weekDays.length;

  // Projection: extrapolate to 7 days
  const projection = weekDayCount > 0 ? (weekTotal / weekDayCount) * 7 : 0;

  // 7-day stats
  const total7 = days.reduce((s, d) => s + d.cost, 0);
  const avg7 = days.length > 0 ? total7 / days.length : 0;

  // Budget percentage
  const weekPct = (weekTotal / config.weeklyBudget) * 100;

  return {
    yesterday: {
      date: dates.yesterday,
      cost: yCost,
      tokens_input: yData?.tokens_input || 0,
      tokens_output: yData?.tokens_output || 0,
    },
    dayBefore: {
      date: dates.dayBefore,
      cost: dbCost,
      tokens_input: dbData?.tokens_input || 0,
      tokens_output: dbData?.tokens_output || 0,
    },
    threeDaysAgo: {
      date: dates.threeDaysAgo,
      cost: taCost,
      tokens_input: taData?.tokens_input || 0,
      tokens_output: taData?.tokens_output || 0,
    },
    week: {
      startDate: dates.weekStart,
      endDate: dates.weekEnd,
      total: weekTotal,
      projection,
      pct: weekPct.toFixed(1),
      dayCount: weekDayCount,
    },
    sevenDays: { total: total7, avg: avg7 },
    dailyCosts: days,
  };
}

/** Determine alerts based on metrics */
export function computeAlerts(
  config: Config,
  metrics: ReturnType<typeof computeMetrics>,
): { alerts: string[]; protectionMode: boolean } {
  const alerts: string[] = [];
  let protectionMode = false;

  const { yesterday, week, sevenDays } = metrics;

  // Anomaly: J-1 > 2× average
  if (sevenDays.avg > 0 && yesterday.cost > 2 * sevenDays.avg) {
    alerts.push(`anomaly: J-1 $${yesterday.cost.toFixed(2)} > 2x avg $${sevenDays.avg.toFixed(2)}`);
  }

  // > 50% budget
  if (week.total > config.alertThreshold * config.weeklyBudget) {
    protectionMode = true;
    alerts.push(`budget_50: $${week.total.toFixed(2)}/$${config.weeklyBudget}`);
  }

  // > 80% budget
  if (week.total > 0.8 * config.weeklyBudget) {
    alerts.push(`budget_80: $${week.total.toFixed(2)}/$${config.weeklyBudget}`);
  }

  // Projection over limit
  if (week.projection > config.weeklyBudget) {
    alerts.push(`projection: $${week.projection.toFixed(2)} > $${config.weeklyBudget}`);
  }

  return { alerts, protectionMode };
}

/** Build updated state from metrics and alerts */
export function buildState(
  config: Config,
  currentState: UsageState,
  metrics: ReturnType<typeof computeMetrics>,
  alertResult: ReturnType<typeof computeAlerts>,
): UsageState {
  return {
    lastCheck: Date.now(),
    protection_mode: alertResult.protectionMode || currentState.protection_mode,
    weekly_reset_day: 'monday',
    weekly_reset_hour: config.resetHour,
    budget: {
      weekly_limit: config.weeklyBudget,
      alert_threshold: config.alertThreshold,
    },
    current_week: {
      start_date: metrics.week.startDate,
      end_date: metrics.week.endDate,
      total_cost: metrics.week.total,
      projection: metrics.week.projection,
      pct: metrics.week.pct,
    },
    last_7_days: {
      avg_daily: metrics.sevenDays.avg,
      total: metrics.sevenDays.total,
    },
    yesterday: {
      date: metrics.yesterday.date,
      cost: metrics.yesterday.cost,
      tokens_input: metrics.yesterday.tokens_input,
      tokens_output: metrics.yesterday.tokens_output,
    },
    day_before: {
      date: metrics.dayBefore.date,
      cost: metrics.dayBefore.cost,
      tokens_input: metrics.dayBefore.tokens_input,
      tokens_output: metrics.dayBefore.tokens_output,
    },
    three_days_ago: {
      date: metrics.threeDaysAgo.date,
      cost: metrics.threeDaysAgo.cost,
      tokens_input: metrics.threeDaysAgo.tokens_input,
      tokens_output: metrics.threeDaysAgo.tokens_output,
    },
    daily_costs_7d: metrics.dailyCosts,
    alerts: alertResult.alerts,
    last_alert_ts: currentState.last_alert_ts,
    error: null,
  };
}
