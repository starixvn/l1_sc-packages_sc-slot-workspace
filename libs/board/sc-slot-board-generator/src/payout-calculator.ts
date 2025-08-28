import { filter, map, sum, reduce, groupBy, keys, values } from "ramda";
import { isMultiplierSymbol } from "./board-helper";
import * as fs from "fs";
import * as path from "path";

export interface PayoutRule {
    symbol: number;
    payouts: {
        count: number; // Minimum count for this payout tier
        multiplier: number; // Payout multiplier for this tier
    }[];
}

export interface PayoutTier {
    count: number;
    multiplier: number;
    description?: string;
    freeSpins?: number;
}

export interface SymbolPayoutConfig {
    symbol: number;
    name: string;
    type: "premium" | "high" | "medium" | "low";
    payouts: PayoutTier[];
}

export interface ScatterPayoutConfig {
    symbol: number;
    name: string;
    type: "scatter";
    description: string;
    payouts: PayoutTier[];
}

export interface MultiplierOrbConfig {
    symbol: number;
    name: string;
    type: "multiplier";
    description: string;
    valueRange: {
        min: number;
        max: number;
    };
}

export interface PayoutRulesConfig {
    version: string;
    gameType: string;
    description: string;
    symbolPayouts: SymbolPayoutConfig[];
    specialSymbols: {
        zeus: ScatterPayoutConfig;
        multiplierOrb: MultiplierOrbConfig;
    };
    gameRules: {
        minSymbolWinCount: number;
        description: string;
        winDetection: string;
        cascading: boolean;
        freeSpins: {
            triggeredBy: string;
            retriggerRules: {
                count: number;
                additionalSpins: number;
                description: string;
            };
        };
    };
}

export interface SymbolWin {
    symbol: number;
    positions: number[];
    count: number;
    baseWin: number;
    multipliedWin: number;
}

export interface ScatterWin {
    count: number;
    baseWin: number;
    triggersFreeSpin: boolean;
    freeSpins: number;
}

export interface PayoutResult {
    totalWin: number;
    symbolWins: SymbolWin[];
    scatterWin?: ScatterWin;
    winningSymbols: number[];
    multiplierOrbValue: number;
    triggersFreeSpin: boolean;
    freeSpinsAwarded: number;
}

// Game constants
export const ZEUS_SCATTER_SYMBOL = 9;
export const MULTIPLIER_ORB_SYMBOL = 10;
export const MIN_SYMBOL_WIN_COUNT = 8;

export class PayoutCalculator {
    private readonly payoutRules: PayoutRule[];
    private readonly baseWinMultiplier: number;
    private readonly rulesConfig: PayoutRulesConfig;
    private readonly scatterConfig: ScatterPayoutConfig;

    constructor(baseWinMultiplier: number = 1, customRulesConfig?: PayoutRulesConfig) {
        this.baseWinMultiplier = baseWinMultiplier;
        this.rulesConfig = customRulesConfig || this.loadDefaultPayoutRules();
        this.scatterConfig = this.rulesConfig.specialSymbols.zeus;
        this.payoutRules = this.createPayoutRulesFromConfig();
    }

    /**
     * Load default payout rules from JSON file
     */
    private loadDefaultPayoutRules(): PayoutRulesConfig {
        try {
            const rulesPath = path.join(__dirname, "payout-rules.json");
            const rulesData = fs.readFileSync(rulesPath, "utf-8");
            return JSON.parse(rulesData) as PayoutRulesConfig;
        } catch (error) {
            console.warn("Could not load payout-rules.json, using hardcoded defaults:", error);
            return this.getHardcodedPayoutRules();
        }
    }

    /**
     * Create PayoutRule array from loaded configuration
     */
    private createPayoutRulesFromConfig(): PayoutRule[] {
        return this.rulesConfig.symbolPayouts.map((symbolConfig) => ({
            symbol: symbolConfig.symbol,
            payouts: symbolConfig.payouts.map((payout) => ({
                count: payout.count,
                multiplier: payout.multiplier,
            })),
        }));
    }

    /**
     * Fallback hardcoded payout rules if JSON loading fails
     */
    private getHardcodedPayoutRules(): PayoutRulesConfig {
        return {
            version: "1.0",
            gameType: "Zeus Cascading Slots",
            description: "Default hardcoded payout rules",
            symbolPayouts: [
                {
                    symbol: 0,
                    name: "Crown",
                    type: "premium",
                    payouts: [
                        { count: 8, multiplier: 10, description: "8-9 symbols" },
                        { count: 10, multiplier: 25, description: "10-11 symbols" },
                        { count: 12, multiplier: 50, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 1,
                    name: "Hourglass",
                    type: "high",
                    payouts: [
                        { count: 8, multiplier: 1.5, description: "8-9 symbols" },
                        { count: 10, multiplier: 2, description: "10-11 symbols" },
                        { count: 12, multiplier: 12, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 2,
                    name: "Ring",
                    type: "high",
                    payouts: [
                        { count: 8, multiplier: 2, description: "8-9 symbols" },
                        { count: 10, multiplier: 5, description: "10-11 symbols" },
                        { count: 12, multiplier: 15, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 3,
                    name: "Goblet",
                    type: "high",
                    payouts: [
                        { count: 8, multiplier: 1.5, description: "8-9 symbols" },
                        { count: 10, multiplier: 2, description: "10-11 symbols" },
                        { count: 12, multiplier: 12, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 4,
                    name: "Red Gem",
                    type: "medium",
                    payouts: [
                        { count: 8, multiplier: 1, description: "8-9 symbols" },
                        { count: 10, multiplier: 1.5, description: "10-11 symbols" },
                        { count: 12, multiplier: 10, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 5,
                    name: "Purple Gem",
                    type: "medium",
                    payouts: [
                        { count: 8, multiplier: 0.8, description: "8-9 symbols" },
                        { count: 10, multiplier: 1.2, description: "10-11 symbols" },
                        { count: 12, multiplier: 8, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 6,
                    name: "Yellow Gem",
                    type: "low",
                    payouts: [
                        { count: 8, multiplier: 0.5, description: "8-9 symbols" },
                        { count: 10, multiplier: 1, description: "10-11 symbols" },
                        { count: 12, multiplier: 5, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 7,
                    name: "Green Gem",
                    type: "low",
                    payouts: [
                        { count: 8, multiplier: 0.4, description: "8-9 symbols" },
                        { count: 10, multiplier: 0.9, description: "10-11 symbols" },
                        { count: 12, multiplier: 4, description: "12+ symbols" },
                    ],
                },
                {
                    symbol: 8,
                    name: "Blue Gem",
                    type: "low",
                    payouts: [
                        { count: 8, multiplier: 0.25, description: "8-9 symbols" },
                        { count: 10, multiplier: 0.75, description: "10-11 symbols" },
                        { count: 12, multiplier: 2, description: "12+ symbols" },
                    ],
                },
            ],
            specialSymbols: {
                zeus: {
                    symbol: 9,
                    name: "Zeus Scatter",
                    type: "scatter",
                    description: "Triggers free spins",
                    payouts: [
                        { count: 4, multiplier: 3, freeSpins: 15, description: "4 scatters" },
                        { count: 5, multiplier: 5, freeSpins: 15, description: "5 scatters" },
                        { count: 6, multiplier: 100, freeSpins: 15, description: "6+ scatters" },
                    ],
                },
                multiplierOrb: {
                    symbol: 10,
                    name: "Multiplier Orb",
                    type: "multiplier",
                    description: "Accumulates multiplier during free spins",
                    valueRange: {
                        min: 2,
                        max: 21,
                    },
                },
            },
            gameRules: {
                minSymbolWinCount: 8,
                description: "Minimum symbols required for any win",
                winDetection: "count-based",
                cascading: true,
                freeSpins: {
                    triggeredBy: "zeus",
                    retriggerRules: {
                        count: 3,
                        additionalSpins: 5,
                        description: "3+ Zeus during free spins awards 5 more spins",
                    },
                },
            },
        };
    }

    /**
     * Calculate payout for a given board state using count-based wins
     */
    calculatePayout(board: number[], multipliers: number[], betSize: number = 1, accumulatedMultiplier: number = 0): PayoutResult {
        // Count symbols on the board
        const symbolCounts = this.countSymbols(board);

        // Calculate regular symbol wins (8+ symbols required)
        const symbolWins = this.calculateSymbolWins(symbolCounts, board, betSize);

        // Calculate scatter wins (Zeus symbols)
        const scatterWin = this.calculateScatterWin(symbolCounts[ZEUS_SCATTER_SYMBOL] || 0, betSize);

        // Extract multiplier orb value
        const multiplierOrbValue = this.extractMultiplierOrbValue(board, multipliers);

        // Apply accumulated multiplier from free spins if present
        const finalSymbolWins = this.applyAccumulatedMultiplier(symbolWins, accumulatedMultiplier);

        // Calculate total win
        const symbolWinTotal = sum(map((win) => win.multipliedWin, finalSymbolWins));
        const scatterWinTotal = scatterWin ? scatterWin.baseWin : 0;
        const totalWin = symbolWinTotal + scatterWinTotal;

        // Get all winning symbol positions
        const winningSymbols = this.extractWinningPositions(symbolWins);

        return {
            totalWin,
            symbolWins: finalSymbolWins,
            scatterWin,
            winningSymbols,
            multiplierOrbValue,
            triggersFreeSpin: scatterWin ? scatterWin.triggersFreeSpin : false,
            freeSpinsAwarded: scatterWin ? scatterWin.freeSpins : 0,
        };
    }

    /**
     * Count symbols on the board (count-based wins, not cluster-based)
     */
    private countSymbols(board: number[]): Record<number, number> {
        const counts: Record<number, number> = {};

        for (const symbol of board) {
            if (symbol >= 0) {
                // Only count valid symbols
                counts[symbol] = (counts[symbol] || 0) + 1;
            }
        }

        return counts;
    }

    /**
     * Calculate symbol wins based on count (8+ symbols required)
     */
    private calculateSymbolWins(symbolCounts: Record<number, number>, board: number[], betSize: number): SymbolWin[] {
        const symbolWins: SymbolWin[] = [];

        for (const rule of this.payoutRules) {
            const count = symbolCounts[rule.symbol] || 0;

            if (count >= MIN_SYMBOL_WIN_COUNT) {
                // Find the appropriate payout tier
                const payout = this.getPayoutForCount(rule, count);
                const baseWin = payout.multiplier * betSize * this.baseWinMultiplier;

                // Get positions of this symbol on the board
                const positions = this.getSymbolPositions(board, rule.symbol);

                symbolWins.push({
                    symbol: rule.symbol,
                    positions,
                    count,
                    baseWin,
                    multipliedWin: baseWin, // Will be updated if multipliers apply
                });
            }
        }

        return symbolWins;
    }

    /**
     * Get the appropriate payout tier for a given symbol count
     */
    private getPayoutForCount(rule: PayoutRule, count: number): { count: number; multiplier: number } {
        // Sort payouts by count descending to find the highest applicable tier
        const sortedPayouts = [...rule.payouts].sort((a, b) => b.count - a.count);

        for (const payout of sortedPayouts) {
            if (count >= payout.count) {
                return payout;
            }
        }

        // Should not reach here if MIN_SYMBOL_WIN_COUNT is enforced
        return rule.payouts[0];
    }

    /**
     * Get positions of a specific symbol on the board
     */
    private getSymbolPositions(board: number[], symbol: number): number[] {
        const positions: number[] = [];

        for (let i = 0; i < board.length; i++) {
            if (board[i] === symbol) {
                positions.push(i);
            }
        }

        return positions;
    }

    /**
     * Calculate scatter wins (Zeus symbols)
     */
    private calculateScatterWin(scatterCount: number, betSize: number): ScatterWin | undefined {
        // Find the appropriate scatter payout tier
        const scatterPayout = this.getScatterPayoutForCount(scatterCount);

        if (!scatterPayout) {
            return undefined; // No scatter win
        }

        return {
            count: scatterCount,
            baseWin: scatterPayout.multiplier * betSize,
            triggersFreeSpin: true,
            freeSpins: scatterPayout.freeSpins || 15,
        };
    }

    /**
     * Get the appropriate scatter payout tier for a given scatter count
     */
    private getScatterPayoutForCount(count: number): PayoutTier | undefined {
        // Sort payouts by count descending to find the highest applicable tier
        const sortedPayouts = [...this.scatterConfig.payouts].sort((a, b) => b.count - a.count);

        for (const payout of sortedPayouts) {
            if (count >= payout.count) {
                return payout;
            }
        }

        return undefined;
    }

    /**
     * Extract multiplier orb value from the board
     */
    private extractMultiplierOrbValue(board: number[], multipliers: number[]): number {
        // Find positions with multiplier orb symbols
        const orbPositions = this.getSymbolPositions(board, MULTIPLIER_ORB_SYMBOL);

        if (orbPositions.length === 0 || multipliers.length === 0) {
            return 0;
        }

        // Return the first multiplier value (assuming one orb per spin)
        return multipliers[0] || 0;
    }

    /**
     * Apply accumulated multiplier from free spins to symbol wins
     */
    private applyAccumulatedMultiplier(symbolWins: SymbolWin[], accumulatedMultiplier: number): SymbolWin[] {
        if (accumulatedMultiplier <= 0) {
            return symbolWins; // No accumulated multiplier to apply
        }

        return map(
            (win) => ({
                ...win,
                multipliedWin: win.baseWin * (1 + accumulatedMultiplier),
            }),
            symbolWins
        );
    }

    /**
     * Extract all winning symbol positions from symbol wins
     */
    private extractWinningPositions(symbolWins: SymbolWin[]): number[] {
        return reduce((acc, win) => acc.concat(win.positions), [] as number[], symbolWins);
    }

    /**
     * Update payout rules for balancing
     */
    updatePayoutRules(rules: PayoutRule[]): void {
        this.payoutRules.splice(0, this.payoutRules.length, ...rules);
    }

    /**
     * Get current payout rules
     */
    getPayoutRules(): PayoutRule[] {
        return [...this.payoutRules];
    }

    /**
     * Get the full rules configuration
     */
    getRulesConfig(): PayoutRulesConfig {
        return this.rulesConfig;
    }

    /**
     * Load payout rules from a custom JSON file
     */
    static loadPayoutRulesFromFile(filePath: string): PayoutRulesConfig {
        try {
            const rulesData = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(rulesData) as PayoutRulesConfig;
        } catch (error) {
            throw new Error(`Failed to load payout rules from ${filePath}: ${error}`);
        }
    }

    /**
     * Create PayoutCalculator with custom rules from file
     */
    static createWithCustomRules(rulesFilePath: string, baseWinMultiplier: number = 1): PayoutCalculator {
        const customRules = PayoutCalculator.loadPayoutRulesFromFile(rulesFilePath);
        return new PayoutCalculator(baseWinMultiplier, customRules);
    }
}
