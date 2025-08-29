import { clone, map } from "ramda";
import { BoardGenerator, IBoard, BoardSettings } from "../board-generator";
import { PayoutCalculator, PayoutResult } from "../payout-calculator";
import { MultiplierConfig } from "../multiplier-generator";
import { Difficulty } from "../difficulties";

export interface SimpleBoardResult {
    board: number[];
    multipliers: number[];
    payoutResult: PayoutResult;
    cascadeCount: number;
    totalCascadeWin: number;
    isFreeSpin: boolean;
    accumulatedMultiplier: number;
    remainingFreeSpins: number;
}

export interface SimpleCascadeSequence {
    initialBoard: number[];
    cascades: {
        board: number[];
        winResult: PayoutResult;
        explodedSymbols: number[];
        newSymbols: number[];
        multipliers: number[];
    }[];
    finalBoard: number[];
    totalWin: number;
    triggeredFreeSpin: boolean;
    freeSpinsAwarded: number;
}

/**
 * Simplified Result Chain Generator without RTP control
 * This focuses purely on board generation and cascade simulation
 */
export class SimpleResultChainGenerator {
    private readonly boardGenerator: BoardGenerator;
    private readonly payoutCalculator: PayoutCalculator;

    constructor(boardSettings: BoardSettings, multiplierConfig: MultiplierConfig, difficulty: Difficulty = Difficulty.Medium) {
        this.boardGenerator = new BoardGenerator(boardSettings, multiplierConfig, null, difficulty);
        this.payoutCalculator = new PayoutCalculator();
    }

    /**
     * Generate a specific number of boards without RTP constraints
     */
    async generateBoards(boardCount: number, betSize: number = 1): Promise<SimpleBoardResult[]> {
        const boards: SimpleBoardResult[] = [];

        console.log(`🎲 Generating ${boardCount} boards...`);

        for (let i = 0; i < boardCount; i++) {
            const boardResult = await this.generateSingleBoard(betSize);
            boards.push(boardResult);

            if (i % 50 === 49) {
                console.log(`📊 Progress: ${i + 1}/${boardCount} boards generated`);
            }
        }

        console.log(`✅ Generated ${boards.length} boards`);
        return boards;
    }

    /**
     * Generate a single board with natural randomness (no target win)
     */
    async generateSingleBoard(betSize: number): Promise<SimpleBoardResult> {
        const maxAttempts = 10; // Reduced since we don't need to hit specific targets
        let bestBoard: IBoard | null = null;
        let bestCascadeSequence: SimpleCascadeSequence | null = null;
        let bestTotalWin = 0;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const initialBoard = this.boardGenerator.generate();
            const cascadeSequence = this.simulateFullCascade(initialBoard, betSize);

            if (bestBoard === null || cascadeSequence.totalWin > bestTotalWin) {
                bestBoard = initialBoard;
                bestCascadeSequence = cascadeSequence;
                bestTotalWin = cascadeSequence.totalWin;
            }

            // Accept first reasonable result (no need to optimize for specific targets)
            if (cascadeSequence.totalWin > 0) {
                break;
            }
        }

        // Calculate final payout result for the entire cascade
        const finalPayoutResult = this.payoutCalculator.calculatePayout(
            bestCascadeSequence!.finalBoard, 
            bestBoard!.multipliers, 
            betSize
        );

        return {
            board: bestBoard!.newBoard,
            multipliers: bestBoard!.multipliers,
            payoutResult: finalPayoutResult,
            cascadeCount: bestCascadeSequence!.cascades.length,
            totalCascadeWin: bestTotalWin,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0,
        };
    }

    /**
     * Simulate complete cascade sequence for a board
     */
    private simulateFullCascade(initialBoard: IBoard, betSize: number, accumulatedMultiplier: number = 0): SimpleCascadeSequence {
        let currentBoard = clone(initialBoard.newBoard);
        let currentMultipliers = clone(initialBoard.multipliers);
        let totalWin = 0;
        const cascades: SimpleCascadeSequence["cascades"] = [];
        const maxCascades = 10; // Prevent infinite loops
        let triggeredFreeSpin = false;
        let freeSpinsAwarded = 0;

        for (let cascadeLevel = 0; cascadeLevel < maxCascades; cascadeLevel++) {
            const payoutResult = this.payoutCalculator.calculatePayout(
                currentBoard,
                currentMultipliers,
                betSize,
                accumulatedMultiplier
            );

            if (payoutResult.winningSymbols.length === 0 && !payoutResult.triggersFreeSpin) {
                // No more wins and no free spin trigger, cascade ends
                break;
            }

            totalWin += payoutResult.totalWin;

            // Check for free spin trigger
            if (payoutResult.triggersFreeSpin) {
                triggeredFreeSpin = true;
                freeSpinsAwarded = payoutResult.freeSpinsAwarded;
            }

            // Only perform cascade if there are winning symbols
            if (payoutResult.winningSymbols.length > 0) {
                const cascadeResult = this.boardGenerator.explodeAndRefill(
                    currentBoard,
                    payoutResult.winningSymbols,
                    currentMultipliers
                );

                cascades.push({
                    board: clone(currentBoard),
                    winResult: payoutResult,
                    explodedSymbols: cascadeResult.explodedSymbols || [],
                    newSymbols: cascadeResult.newSymbols || [],
                    multipliers: cascadeResult.multipliers,
                });

                // Update for next cascade
                currentBoard = cascadeResult.newBoard;
                currentMultipliers = cascadeResult.multipliers;
            } else {
                // No tumbling symbols, but there might be scatter wins
                cascades.push({
                    board: clone(currentBoard),
                    winResult: payoutResult,
                    explodedSymbols: [],
                    newSymbols: [],
                    multipliers: currentMultipliers,
                });
                break;
            }
        }

        return {
            initialBoard: initialBoard.newBoard,
            cascades,
            finalBoard: currentBoard,
            totalWin,
            triggeredFreeSpin,
            freeSpinsAwarded,
        };
    }

    /**
     * Get basic statistics from generated boards
     */
    calculateBasicStats(boards: SimpleBoardResult[], betSize: number): {
        totalBoards: number;
        winningBoards: number;
        hitFrequency: number;
        totalBets: number;
        totalWins: number;
        averageWin: number;
        maxWin: number;
        rtp: number;
    } {
        const totalBoards = boards.length;
        const winningBoards = boards.filter(b => b.totalCascadeWin > 0).length;
        const hitFrequency = winningBoards / totalBoards;
        const totalBets = boards.length * betSize;
        const totalWins = boards.reduce((sum, board) => sum + board.totalCascadeWin, 0);
        const averageWin = totalWins / totalBoards;
        const maxWin = Math.max(...boards.map(board => board.totalCascadeWin));
        const rtp = totalWins / totalBets;

        return {
            totalBoards,
            winningBoards,
            hitFrequency,
            totalBets,
            totalWins,
            averageWin,
            maxWin,
            rtp,
        };
    }

    /**
     * Export boards to JSON
     */
    exportBoardsToJSON(boards: SimpleBoardResult[], betSize: number): string {
        const stats = this.calculateBasicStats(boards, betSize);
        
        const exportData = {
            metadata: {
                generated: new Date().toISOString(),
                boardCount: boards.length,
                betSize,
                stats,
            },
            boards: boards.map((board, index) => ({
                index,
                board: board.board,
                multipliers: board.multipliers,
                totalWin: board.totalCascadeWin,
                cascadeCount: board.cascadeCount,
                symbolWins: board.payoutResult.symbolWins,
                scatterWin: board.payoutResult.scatterWin,
            })),
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Get the board generator (for external use)
     */
    getBoardGenerator(): BoardGenerator {
        return this.boardGenerator;
    }

    /**
     * Get the payout calculator (for external use)
     */
    getPayoutCalculator(): PayoutCalculator {
        return this.payoutCalculator;
    }
}

