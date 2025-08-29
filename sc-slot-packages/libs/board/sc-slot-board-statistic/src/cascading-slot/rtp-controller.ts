import { sum, mean, map, filter, reduce, range } from "ramda";

export interface RTPConfiguration {
    targetRTP: number; // e.g., 0.97 for 97%
    tolerance: number; // e.g., 0.01 for ±1%
    boardCount: number; // e.g., 120 for 120 rounds
    betSize: number; // e.g., 1 coin per round
    playerBudget: number; // e.g., 100 coins
}

export interface RTPResult {
    actualRTP: number;
    totalBets: number;
    totalWins: number;
    meetsTarget: boolean;
    variance: number;
    hitFrequency: number; // percentage of boards with wins
}

export interface BoardResult {
    board: number[];
    multipliers: number[];
    payoutResult?: any; // Will be populated by settlement
    cascadeCount: number;
    totalCascadeWin: number;
    isFreeSpin: boolean;
    accumulatedMultiplier: number;
    remainingFreeSpins: number;
    // Settlement-specific data
    settlementResult?: {
        tumbles: {
            icons: Record<string, { count: number; odds: number }>;
            win: number;
            originalBoard: string;
            newBoard: string;
            multipliers: number[];
        }[];
        freeSpins: { count: number; odds: number };
        additionalFreeSpins: { count: number; odds: number };
    };
    totalTumbleWin?: number;
}

export interface WinDistribution {
    noWin: number;
    smallWin: number; // 0.1x - 1x bet
    mediumWin: number; // 1x - 5x bet
    bigWin: number; // 5x - 20x bet
    megaWin: number; // 20x+ bet
}

export class RTPController {
    private config: RTPConfiguration;
    private readonly targetDistribution: WinDistribution;

    constructor(config: RTPConfiguration) {
        this.config = config;
        this.targetDistribution = this.calculateTargetDistribution();
    }

    /**
     * Calculate optimal win distribution for target RTP
     * Based on typical slot game mathematics
     */
    private calculateTargetDistribution(): WinDistribution {
        const rtp = this.config.targetRTP;

        // Typical distribution for cascading slots
        return {
            noWin: 0.65, // 65% of spins have no win
            smallWin: 0.25, // 25% small wins (keep player engaged)
            mediumWin: 0.08, // 8% medium wins
            bigWin: 0.015, // 1.5% big wins
            megaWin: 0.005, // 0.5% mega wins
        };
    }

    /**
     * Validate if a board chain meets RTP requirements
     */
    validateRTP(boardResults: BoardResult[]): RTPResult {
        const totalBets = boardResults.length * this.config.betSize;
        const totalWins = sum(map((result) => result.totalCascadeWin, boardResults));
        const actualRTP = totalWins / totalBets;

        const winningBoards = filter((result) => result.totalCascadeWin > 0, boardResults);
        const hitFrequency = winningBoards.length / boardResults.length;

        const variance = this.calculateVariance(boardResults);
        const meetsTarget = Math.abs(actualRTP - this.config.targetRTP) <= this.config.tolerance;

        return {
            actualRTP,
            totalBets,
            totalWins,
            meetsTarget,
            variance,
            hitFrequency,
        };
    }

    /**
     * Calculate variance of wins for volatility measurement
     */
    private calculateVariance(boardResults: BoardResult[]): number {
        const wins = map((result) => result.totalCascadeWin, boardResults);
        const meanWin = mean(wins);
        const squaredDiffs = map((win) => Math.pow(win - meanWin, 2), wins);
        return mean(squaredDiffs);
    }

    /**
     * Calculate required wins for remaining boards to meet target RTP
     */
    calculateRequiredWins(currentTotalWins: number, boardsCompleted: number): number {
        const boardsRemaining = this.config.boardCount - boardsCompleted;
        const totalTargetWins = this.config.boardCount * this.config.betSize * this.config.targetRTP;
        const requiredWins = totalTargetWins - currentTotalWins;

        return Math.max(0, requiredWins);
    }

    /**
     * Determine if next board should be a winning or losing board
     */
    shouldNextBoardWin(currentResults: BoardResult[]): boolean {
        if (currentResults.length === 0) return true; // First board can win

        const currentRTP = this.calculateCurrentRTP(currentResults);
        const boardsRemaining = this.config.boardCount - currentResults.length;

        // If we're behind target, increase win probability
        if (currentRTP < this.config.targetRTP - this.config.tolerance) {
            return Math.random() < 0.7; // 70% chance to win
        }

        // If we're ahead of target, decrease win probability
        if (currentRTP > this.config.targetRTP + this.config.tolerance) {
            return Math.random() < 0.2; // 20% chance to win
        }

        // Use natural distribution
        const distribution = this.targetDistribution;
        return Math.random() > distribution.noWin;
    }

    /**
     * Calculate current RTP from completed boards
     */
    private calculateCurrentRTP(currentResults: BoardResult[]): number {
        if (currentResults.length === 0) return 0;

        const totalBets = currentResults.length * this.config.betSize;
        const totalWins = sum(map((result) => result.totalCascadeWin, currentResults));

        return totalWins / totalBets;
    }

    /**
     * Get target win size for next winning board
     */
    getTargetWinSize(currentResults: BoardResult[]): number {
        const currentRTP = this.calculateCurrentRTP(currentResults);
        const rtpDeficit = this.config.targetRTP - currentRTP;
        const boardsRemaining = this.config.boardCount - currentResults.length;

        if (rtpDeficit > 0 && boardsRemaining > 0) {
            // Need to catch up - return larger win
            const catchUpWin = (rtpDeficit * currentResults.length * this.config.betSize) / boardsRemaining;
            return Math.max(catchUpWin, this.config.betSize * 0.1); // Minimum 0.1x bet
        }

        // Use natural win distribution
        const rand = Math.random();
        if (rand < this.targetDistribution.megaWin) {
            return this.config.betSize * (20 + Math.random() * 80); // 20x-100x bet
        } else if (rand < this.targetDistribution.megaWin + this.targetDistribution.bigWin) {
            return this.config.betSize * (5 + Math.random() * 15); // 5x-20x bet
        } else if (rand < this.targetDistribution.megaWin + this.targetDistribution.bigWin + this.targetDistribution.mediumWin) {
            return this.config.betSize * (1 + Math.random() * 4); // 1x-5x bet
        } else {
            return this.config.betSize * (0.1 + Math.random() * 0.9); // 0.1x-1x bet
        }
    }

    /**
     * Get configuration
     */
    getConfig(): RTPConfiguration {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<RTPConfiguration>): void {
        Object.assign(this.config, newConfig);
    }
}

