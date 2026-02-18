import type { Config } from './config.js';
export interface CostDayResult {
    amount: string;
}
export interface CostDayEntry {
    starting_at: string;
    ending_at: string;
    results: CostDayResult[];
}
export interface CostReportResponse {
    data: CostDayEntry[];
    type?: string;
    statusCode?: number;
    error?: {
        message: string;
    };
    message?: string;
}
export interface UsageDayResult {
    input_tokens: number;
    output_tokens: number;
}
export interface UsageDayEntry {
    starting_at: string;
    ending_at: string;
    results: UsageDayResult[];
}
export interface UsageReportResponse {
    data: UsageDayEntry[];
    type?: string;
    statusCode?: number;
    error?: {
        message: string;
    };
    message?: string;
}
/** Parsed daily cost */
export interface DailyCost {
    date: string;
    cost: number;
    tokens_input?: number;
    tokens_output?: number;
}
/**
 * Fetch cost report from the proxy for a date range.
 * No client-side rate limiting — trust the proxy (20 req/min).
 */
export declare function fetchCostReport(config: Config, startDate: string, endDate: string): Promise<DailyCost[]>;
/**
 * Fetch usage report (tokens) from the proxy for a date range.
 * No client-side rate limiting — trust the proxy (20 req/min).
 */
export declare function fetchUsageReport(config: Config, startDate: string, endDate: string): Promise<{
    date: string;
    tokens_input: number;
    tokens_output: number;
}[]>;
/**
 * Fetch both cost and usage reports and merge them by date.
 */
export declare function fetchFullReport(config: Config, startDate: string, endDate: string): Promise<DailyCost[]>;
