import { readState, writeState } from './state.js';
/** Get current protection mode status */
export function getProtectionStatus(config) {
    const state = readState(config);
    const lastCheck = state.lastCheck
        ? new Date(state.lastCheck).toISOString()
        : 'never';
    let reason = 'Under budget threshold';
    if (state.protection_mode) {
        const pct = state.current_week.pct || '0';
        reason = `Weekly cost at ${pct}% of budget ($${state.current_week.total_cost.toFixed(2)}/$${config.weeklyBudget})`;
    }
    return {
        enabled: state.protection_mode,
        reason,
        weekTotal: state.current_week.total_cost,
        weeklyBudget: config.weeklyBudget,
        weekPct: state.current_week.pct || '0',
        lastCheck,
    };
}
/** Manually enable protection mode */
export function enableProtection(config) {
    const state = readState(config);
    state.protection_mode = true;
    writeState(config, state);
}
/** Manually disable protection mode */
export function disableProtection(config) {
    const state = readState(config);
    state.protection_mode = false;
    writeState(config, state);
}
