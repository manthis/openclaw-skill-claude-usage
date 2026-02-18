import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const DEFAULT_STATE = {
    lastCheck: 0,
    protection_mode: false,
    weekly_reset_day: 'monday',
    weekly_reset_hour: 21,
    budget: { weekly_limit: 625.0, alert_threshold: 0.5 },
    current_week: { start_date: '', end_date: '', total_cost: 0, projection: 0 },
    last_7_days: { avg_daily: 0, total: 0 },
    yesterday: { date: '', cost: 0, tokens_input: 0, tokens_output: 0 },
    day_before: { date: '', cost: 0, tokens_input: 0, tokens_output: 0 },
    three_days_ago: { date: '', cost: 0, tokens_input: 0, tokens_output: 0 },
    daily_costs_7d: [],
    alerts: [],
    last_alert_ts: 0,
    error: null,
};
export function readState(config) {
    try {
        const raw = readFileSync(config.stateFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
    }
    catch {
        return { ...DEFAULT_STATE };
    }
}
export function writeState(config, state) {
    mkdirSync(dirname(config.stateFile), { recursive: true });
    writeFileSync(config.stateFile, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}
export function getDefaultState() {
    return { ...DEFAULT_STATE };
}
