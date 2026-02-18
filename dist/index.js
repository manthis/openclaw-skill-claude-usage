#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfigAsync } from './config.js';
import { fetchFullReport } from './proxy.js';
import { readState, writeState } from './state.js';
import { getDateInfo, computeMetrics, computeAlerts, buildState } from './calculations.js';
import { getProtectionStatus, enableProtection, disableProtection } from './protection.js';
import { formatReport, formatWeekSummary, formatDailyBreakdown, formatProtectionStatus, formatSevenDaysDetail, } from './formatters.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
/**
 * Send error alert via iMessage (requires imsg CLI + ALERT_PHONE_NUMBER env var)
 */
async function sendErrorAlert(errorMsg) {
    const phoneNumber = process.env.ALERT_PHONE_NUMBER;
    if (!phoneNumber) {
        // Skip alert if no phone number configured
        return;
    }
    try {
        const alert = `🔴 Claude Usage Check Failed:\n${errorMsg}`;
        await execAsync(`~/bin/send-imsg.sh ${phoneNumber} "${alert.replace(/"/g, '\\"')}"`);
    }
    catch {
        // Silently fail if imsg not available
    }
}
const program = new Command();
program
    .name('claude-usage')
    .description('Claude API usage monitoring and cost tracking')
    .version('1.0.0');
// ─── check ───────────────────────────────────────────────────────
program
    .command('check')
    .description('Fetch latest costs from proxy and update state (heartbeat/cron)')
    .action(async () => {
    const config = await loadConfigAsync();
    const dates = getDateInfo(config);
    try {
        const days = await fetchFullReport(config, dates.sevenDaysAgo, dates.tomorrow);
        const metrics = computeMetrics(config, days, dates);
        const alertResult = computeAlerts(config, metrics);
        const currentState = readState(config);
        const newState = buildState(config, currentState, metrics, alertResult);
        writeState(config, newState);
        // Output state JSON for piping/parsing
        console.log(JSON.stringify(newState, null, 2));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Check failed: ${msg}`);
        // Update state with error
        const state = readState(config);
        state.error = msg;
        state.lastCheck = Date.now();
        writeState(config, state);
        // Send alert if error is not rate limit (rate limit is expected behavior)
        if (!msg.includes('Rate limited')) {
            await sendErrorAlert(msg);
        }
        process.exit(1);
    }
});
// ─── week ────────────────────────────────────────────────────────
program
    .command('week')
    .description('Show current week stats')
    .action(async () => {
    const config = await loadConfigAsync();
    const state = readState(config);
    console.log(formatWeekSummary(state, config));
});
// ─── daily ───────────────────────────────────────────────────────
program
    .command('daily')
    .description('Show daily breakdown')
    .option('-d, --days <n>', 'Number of days to show', '7')
    .action(async () => {
    const config = await loadConfigAsync();
    const state = readState(config);
    console.log(formatDailyBreakdown(state, config));
});
// ─── protection ──────────────────────────────────────────────────
program
    .command('protection')
    .description('Show or toggle protection mode')
    .option('--enable', 'Manually enable protection mode')
    .option('--disable', 'Manually disable protection mode')
    .action(async (opts) => {
    const config = await loadConfigAsync();
    if (opts.enable) {
        enableProtection(config);
        console.log('🛡️  Protection mode ENABLED');
        return;
    }
    if (opts.disable) {
        disableProtection(config);
        console.log('✅ Protection mode DISABLED');
        return;
    }
    const status = getProtectionStatus(config);
    console.log(formatProtectionStatus(status, config));
});
// ─── report ──────────────────────────────────────────────────────
program
    .command('report')
    .description('Generate formatted usage report')
    .option('-f, --format <fmt>', 'Output format: text, json, html', 'text')
    .action(async (opts) => {
    const config = await loadConfigAsync();
    const state = readState(config);
    const format = opts.format;
    console.log(formatReport(state, config, format));
});
// ─── detail ──────────────────────────────────────────────────────
program
    .command('detail')
    .description('Show 7-day detail with tokens and cost')
    .action(async () => {
    const config = await loadConfigAsync();
    const state = readState(config);
    console.log(formatSevenDaysDetail(state, config));
});
program.parse();
