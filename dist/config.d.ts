export interface Config {
    proxyUrl: string;
    proxyToken: string;
    stateFile: string;
    weeklyBudget: number;
    alertThreshold: number;
    resetHour: number;
    timezone: string;
    usdToEur: number;
}
export declare function loadConfig(): Config;
/**
 * Load config with live exchange rate.
 * Use this in CLI commands instead of loadConfig().
 */
export declare function loadConfigAsync(): Promise<Config>;
