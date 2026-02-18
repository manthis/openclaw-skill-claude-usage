import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { costForDate, computeMetrics, computeAlerts } from '../calculations.js';
const mockConfig = {
    proxyUrl: 'http://localhost',
    proxyToken: 'test',
    stateFile: '/tmp/test-state.json',
    weeklyBudget: 625,
    alertThreshold: 0.5,
    resetHour: 21,
    timezone: 'Europe/Paris',
    usdToEur: 0.92,
};
const mockDays = [
    { date: '2026-02-11', cost: 80 },
    { date: '2026-02-12', cost: 90 },
    { date: '2026-02-13', cost: 75 },
    { date: '2026-02-14', cost: 85 },
    { date: '2026-02-15', cost: 70 },
    { date: '2026-02-16', cost: 100 },
    { date: '2026-02-17', cost: 95 },
];
const mockDates = {
    today: '2026-02-18',
    hour: 15,
    dow: 'wednesday',
    dowNum: 3,
    yesterday: '2026-02-17',
    dayBefore: '2026-02-16',
    threeDaysAgo: '2026-02-15',
    sevenDaysAgo: '2026-02-11',
    tomorrow: '2026-02-19',
    weekStart: '2026-02-16',
    weekEnd: '2026-02-23',
};
describe('costForDate', () => {
    it('returns cost for existing date', () => {
        assert.equal(costForDate(mockDays, '2026-02-16'), 100);
    });
    it('returns 0 for missing date', () => {
        assert.equal(costForDate(mockDays, '2026-02-20'), 0);
    });
});
describe('computeMetrics', () => {
    it('computes week total correctly', () => {
        const m = computeMetrics(mockConfig, mockDays, mockDates);
        // Week starts 2026-02-16, so only 2026-02-16 ($100) and 2026-02-17 ($95)
        assert.equal(m.week.total, 195);
    });
    it('computes projection', () => {
        const m = computeMetrics(mockConfig, mockDays, mockDates);
        // 195 / 2 days * 7 = 682.5
        assert.equal(m.week.projection, 682.5);
    });
    it('computes 7-day average', () => {
        const m = computeMetrics(mockConfig, mockDays, mockDates);
        const expected = (80 + 90 + 75 + 85 + 70 + 100 + 95) / 7;
        assert.ok(Math.abs(m.sevenDays.avg - expected) < 0.01);
    });
    it('returns yesterday cost', () => {
        const m = computeMetrics(mockConfig, mockDays, mockDates);
        assert.equal(m.yesterday.cost, 95);
    });
});
describe('computeAlerts', () => {
    it('triggers anomaly when J-1 > 2x avg', () => {
        const highDays = [
            { date: '2026-02-11', cost: 10 },
            { date: '2026-02-12', cost: 10 },
            { date: '2026-02-13', cost: 10 },
            { date: '2026-02-14', cost: 10 },
            { date: '2026-02-15', cost: 10 },
            { date: '2026-02-16', cost: 10 },
            { date: '2026-02-17', cost: 50 }, // 5x avg!
        ];
        const m = computeMetrics(mockConfig, highDays, mockDates);
        const a = computeAlerts(mockConfig, m);
        assert.ok(a.alerts.some(al => al.startsWith('anomaly:')));
    });
    it('activates protection when > 50% budget', () => {
        const bigWeek = [
            { date: '2026-02-16', cost: 200 },
            { date: '2026-02-17', cost: 200 },
        ];
        const m = computeMetrics(mockConfig, bigWeek, mockDates);
        const a = computeAlerts(mockConfig, m);
        assert.ok(a.protectionMode);
        assert.ok(a.alerts.some(al => al.startsWith('budget_50:')));
    });
    it('no alerts when under budget', () => {
        const lowDays = [
            { date: '2026-02-16', cost: 5 },
            { date: '2026-02-17', cost: 5 },
        ];
        const m = computeMetrics(mockConfig, lowDays, mockDates);
        const a = computeAlerts(mockConfig, m);
        assert.equal(a.alerts.length, 0);
        assert.equal(a.protectionMode, false);
    });
    it('triggers projection alert when projection > budget', () => {
        // 2 days at 100 each → projection 350, under 625
        // Need higher: 2 days at 200 → projection 700
        const m = computeMetrics(mockConfig, [
            { date: '2026-02-16', cost: 200 },
            { date: '2026-02-17', cost: 200 },
        ], mockDates);
        const a = computeAlerts(mockConfig, m);
        assert.ok(a.alerts.some(al => al.startsWith('projection:')));
    });
});
