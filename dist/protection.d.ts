import type { Config } from './config.js';
export interface ProtectionStatus {
    enabled: boolean;
    reason: string;
    weekTotal: number;
    weeklyBudget: number;
    weekPct: string;
    lastCheck: string;
}
/** Get current protection mode status */
export declare function getProtectionStatus(config: Config): ProtectionStatus;
/** Manually enable protection mode */
export declare function enableProtection(config: Config): void;
/** Manually disable protection mode */
export declare function disableProtection(config: Config): void;
