import axios, { AxiosError } from 'axios';
/**
 * Fetch cost report from the proxy for a date range.
 * No client-side rate limiting — trust the proxy (20 req/min).
 */
export async function fetchCostReport(config, startDate, endDate) {
    if (!config.proxyToken) {
        throw new Error('CLAUDE_USAGE_PROXY_TOKEN not set. Configure it in env or .env file.');
    }
    const url = `${config.proxyUrl}/v1/organizations/cost_report`;
    const params = {
        starting_at: `${startDate}T00:00:00Z`,
        ending_at: `${endDate}T00:00:00Z`,
    };
    try {
        const resp = await axios.get(url, {
            params,
            headers: { Authorization: `Bearer ${config.proxyToken}` },
            timeout: 45_000,
        });
        const body = resp.data;
        // Check for API/proxy errors
        if (body.type === 'error' || body.statusCode) {
            const msg = body.error?.message || body.message || 'Unknown proxy error';
            throw new Error(`Proxy error: ${msg}`);
        }
        // Parse daily costs
        return (body.data || []).map((entry) => {
            const date = entry.starting_at.split('T')[0];
            const cost = (entry.results || []).reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
            return { date, cost };
        });
    }
    catch (err) {
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
}
/**
 * Fetch usage report (tokens) from the proxy for a date range.
 * No client-side rate limiting — trust the proxy (20 req/min).
 */
export async function fetchUsageReport(config, startDate, endDate) {
    if (!config.proxyToken) {
        throw new Error('CLAUDE_USAGE_PROXY_TOKEN not set. Configure it in env or .env file.');
    }
    const url = `${config.proxyUrl}/v1/organizations/usage_report/messages`;
    const params = {
        starting_at: `${startDate}T00:00:00Z`,
        ending_at: `${endDate}T00:00:00Z`,
    };
    try {
        const resp = await axios.get(url, {
            params,
            headers: { Authorization: `Bearer ${config.proxyToken}` },
            timeout: 45_000,
        });
        const body = resp.data;
        // Check for API/proxy errors
        if (body.type === 'error' || body.statusCode) {
            const msg = body.error?.message || body.message || 'Unknown proxy error';
            throw new Error(`Proxy error: ${msg}`);
        }
        // Parse daily tokens
        return (body.data || []).map((entry) => {
            const date = entry.starting_at.split('T')[0];
            const tokens_input = (entry.results || []).reduce((sum, r) => sum + (r.input_tokens || 0), 0);
            const tokens_output = (entry.results || []).reduce((sum, r) => sum + (r.output_tokens || 0), 0);
            return { date, tokens_input, tokens_output };
        });
    }
    catch (err) {
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
}
/**
 * Fetch both cost and usage reports and merge them by date.
 */
export async function fetchFullReport(config, startDate, endDate) {
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
