import { sum, mean, map, filter } from "ramda";
export class RTPController {
    config;
    targetDistribution;
    constructor(config) {
        this.config = config;
        this.targetDistribution = this.calculateTargetDistribution();
    }
    /**
     * Calculate optimal win distribution for target RTP
     * Based on typical slot game mathematics
     */
    calculateTargetDistribution() {
        const rtp = this.config.targetRTP;
        // Typical distribution for cascading slots
        return {
            noWin: 0.65,
            smallWin: 0.25,
            mediumWin: 0.08,
            bigWin: 0.015,
            megaWin: 0.005, // 0.5% mega wins
        };
    }
    /**
     * Validate if a board chain meets RTP requirements
     */
    validateRTP(boardResults) {
        const totalBets = boardResults.length * this.config.betSize;
        const totalWins = sum(map((result) => result.totalTumbleWin || 0, boardResults));
        const actualRTP = totalWins / totalBets;
        const winningBoards = filter((result) => (result.totalTumbleWin || 0) > 0, boardResults);
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
    calculateVariance(boardResults) {
        const wins = map((result) => result.totalTumbleWin || 0, boardResults);
        const meanWin = mean(wins);
        const squaredDiffs = map((win) => Math.pow(win - meanWin, 2), wins);
        return mean(squaredDiffs);
    }
    /**
     * Calculate required wins for remaining boards to meet target RTP
     */
    calculateRequiredWins(currentTotalWins, boardsCompleted) {
        const boardsRemaining = this.config.boardCount - boardsCompleted;
        const totalTargetWins = this.config.boardCount * this.config.betSize * this.config.targetRTP;
        const requiredWins = totalTargetWins - currentTotalWins;
        return Math.max(0, requiredWins);
    }
    /**
     * Determine if next board should be a winning or losing board
     */
    shouldNextBoardWin(currentResults) {
        if (currentResults.length === 0)
            return true; // First board can win
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
    calculateCurrentRTP(currentResults) {
        if (currentResults.length === 0)
            return 0;
        const totalBets = currentResults.length * this.config.betSize;
        const totalWins = sum(map((result) => result.totalTumbleWin || 0, currentResults));
        return totalWins / totalBets;
    }
    /**
     * Get target win size for next winning board
     */
    getTargetWinSize(currentResults) {
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
        }
        else if (rand < this.targetDistribution.megaWin + this.targetDistribution.bigWin) {
            return this.config.betSize * (5 + Math.random() * 15); // 5x-20x bet
        }
        else if (rand < this.targetDistribution.megaWin + this.targetDistribution.bigWin + this.targetDistribution.mediumWin) {
            return this.config.betSize * (1 + Math.random() * 4); // 1x-5x bet
        }
        else {
            return this.config.betSize * (0.1 + Math.random() * 0.9); // 0.1x-1x bet
        }
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }
}
