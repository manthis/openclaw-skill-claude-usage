import axios, { AxiosError } from 'axios';
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
  error?: { message: string };
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
  error?: { message: string };
  message?: string;
}

/** Parsed daily cost */
export interface DailyCost {
  date: string;   // YYYY-MM-DD
  cost: number;
  tokens_input?: number;
  tokens_output?: number;
}

/** Shared error handler for axios requests */
function handleAxiosError(err: unknown): never {
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      throw new Error('Proxy timeout — server may be waking up (Render cold start). Retry in 1-2 min.');
    }
    if (err.response) {
      throw new Error(`Proxy HTTP ${err.response.status}: ${err.response.statusText}`);
    }
    throw new Error(`Proxy connection error: ${err.message}`);
  }
  throw err;
}

/** Shared proxy GET request with error checking */
async function proxyGet<T extends { type?: string; statusCode?: number; error?: { message: string }; message?: string }>(
  config: Config,
  path: string,
  startDate: string,
  endDate: string,
): Promise<T> {
  if (!config.proxyToken) {
    throw new Error('CLAUDE_USAGE_PROXY_TOKEN not set. Configure it in env or .env file.');
  }

  try {
    const resp = await axios.get<T>(`${config.proxyUrl}${path}`, {
      params: {
        starting_at: `${startDate}T00:00:00Z`,
        ending_at: `${endDate}T00:00:00Z`,
      },
      headers: { Authorization: `Bearer ${config.proxyToken}` },
      timeout: 45_000,
    });

    const body = resp.data;
    if (body.type === 'error' || body.statusCode) {
      const msg = body.error?.message || body.message || 'Unknown proxy error';
      throw new Error(`Proxy error: ${msg}`);
    }
    return body;
  } catch (err) {
    handleAxiosError(err);
  }
}

/**
 * Fetch cost report from the proxy for a date range.
 */
export async function fetchCostReport(
  config: Config,
  startDate: string,
  endDate: string,
): Promise<DailyCost[]> {
  const body = await proxyGet<CostReportResponse>(
    config, '/v1/organizations/cost_report', startDate, endDate,
  );

  return (body.data || []).map((entry) => {
    const date = entry.starting_at.split('T')[0];
    const cost = (entry.results || []).reduce(
      (sum, r) => sum + parseFloat(r.amount || '0'),
      0,
    );
    return { date, cost };
  });
}

/**
 * Fetch usage report (tokens) from the proxy for a date range.
 */
export async function fetchUsageReport(
  config: Config,
  startDate: string,
  endDate: string,
): Promise<{ date: string; tokens_input: number; tokens_output: number }[]> {
  const body = await proxyGet<UsageReportResponse>(
    config, '/v1/organizations/usage_report/messages', startDate, endDate,
  );

  return (body.data || []).map((entry) => {
    const date = entry.starting_at.split('T')[0];
    const tokens_input = (entry.results || []).reduce(
      (sum, r) => sum + (r.input_tokens || 0),
      0,
    );
    const tokens_output = (entry.results || []).reduce(
      (sum, r) => sum + (r.output_tokens || 0),
      0,
    );
    return { date, tokens_input, tokens_output };
  });
}

/**
 * Fetch both cost and usage reports and merge them by date.
 */
export async function fetchFullReport(
  config: Config,
  startDate: string,
  endDate: string,
): Promise<DailyCost[]> {
  const [costs, usage] = await Promise.all([
    fetchCostReport(config, startDate, endDate),
    fetchUsageReport(config, startDate, endDate),
  ]);

  // Merge by date
  const usageMap = new Map(usage.map((u) => [u.date, u]));
  return costs.map((c) => {
    const u = usageMap.get(c.date);
    return {
      ...c,
      tokens_input: u?.tokens_input || 0,
      tokens_output: u?.tokens_output || 0,
    };
  });
}
