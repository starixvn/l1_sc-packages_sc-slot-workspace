import { clone, range, map } from "ramda";
import { BoardGenerator, IBoard, BoardSettings } from "../board-generator";
import { PayoutCalculator, PayoutResult } from "../payout-calculator";
import { RTPController, RTPConfiguration, RTPResult, BoardResult } from "./rtp-controller";
import { MultiplierConfig } from "../multiplier-generator";
import { Difficulty } from "../difficulties";

export interface ResultChainConfig {
    boardCount: number; // Number of boards in chain (100-150)
    targetRTP: number; // Target RTP (0.97 = 97%)
    betSize: number; // Bet size per round
    playerBudget: number; // Player's starting budget
    difficulty: Difficulty; // Game difficulty
    maxRetries: number; // Max attempts to generate valid chain
    tolerance: number; // RTP tolerance (±%)
}

export interface ResultChain {
    config: ResultChainConfig;
    boards: BoardResult[];
    rtpResult: RTPResult;
    generationStats: {
        attempts: number;
        duration: number;
        finalRTP: number;
        averageWin: number;
        maxWin: number;
        hitFrequency: number;
    };
}

export interface CascadeSequence {
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

export interface FreeSpinSession {
    initialMultiplier: number;
    spins: BoardResult[];
    totalWin: number;
    finalMultiplier: number;
}

export class ResultChainGenerator {
    private readonly boardGenerator: BoardGenerator;
    private readonly payoutCalculator: PayoutCalculator;
    private readonly rtpController: RTPController;

    constructor(boardSettings: BoardSettings, multiplierConfig: MultiplierConfig, difficulty: Difficulty = Difficulty.Medium) {
        this.boardGenerator = new BoardGenerator(boardSettings, multiplierConfig, null, difficulty);
        this.payoutCalculator = new PayoutCalculator();

        // Will be initialized per chain generation
        this.rtpController = new RTPController(
            {
                targetRTP: 0.97,
                tolerance: 0.01,
                boardCount: 120,
                betSize: 1,
                playerBudget: 100,
            },
            this.payoutCalculator
        );
    }

    /**
     * Generate a complete predefined board chain meeting RTP requirements
     */
    async generateChain(config: ResultChainConfig): Promise<ResultChain> {
        const startTime = Date.now();
        let bestChain: BoardResult[] = [];
        let bestRTP = 0;
        let attempts = 0;

        // Update RTP controller with new config
        this.rtpController.updateConfig({
            targetRTP: config.targetRTP,
            tolerance: config.tolerance,
            boardCount: config.boardCount,
            betSize: config.betSize,
            playerBudget: config.playerBudget,
        });

        for (attempts = 1; attempts <= config.maxRetries; attempts++) {
            const chain = await this.generateSingleChain(config);
            const rtpResult = this.rtpController.validateRTP(chain);

            if (rtpResult.meetsTarget) {
                bestChain = chain;
                bestRTP = rtpResult.actualRTP;
                break;
            }

            // Keep the best attempt so far
            if (Math.abs(rtpResult.actualRTP - config.targetRTP) < Math.abs(bestRTP - config.targetRTP)) {
                bestChain = chain;
                bestRTP = rtpResult.actualRTP;
            }
        }

        const duration = Date.now() - startTime;
        const finalRtpResult = this.rtpController.validateRTP(bestChain);

        return {
            config,
            boards: bestChain,
            rtpResult: finalRtpResult,
            generationStats: {
                attempts,
                duration,
                finalRTP: finalRtpResult.actualRTP,
                averageWin: finalRtpResult.totalWins / config.boardCount,
                maxWin: Math.max(...map((board) => board.totalCascadeWin, bestChain)),
                hitFrequency: finalRtpResult.hitFrequency,
            },
        };
    }

    /**
     * Generate a single chain attempt
     */
    private async generateSingleChain(config: ResultChainConfig): Promise<BoardResult[]> {
        const boards: BoardResult[] = [];

        for (let i = 0; i < config.boardCount; i++) {
            const shouldWin = this.rtpController.shouldNextBoardWin(boards);
            const targetWinSize = shouldWin ? this.rtpController.getTargetWinSize(boards) : 0;

            const boardResult = await this.generateSingleBoard(targetWinSize, config.betSize);
            boards.push(boardResult);

            // Adjust payout rules if we're drifting from target
            if (i % 20 === 19) {
                // Adjust every 20 boards
                const currentRTP =
                    boards.length > 0 ? boards.reduce((sum, board) => sum + board.totalCascadeWin, 0) / (boards.length * config.betSize) : 0;
                this.rtpController.adjustPayoutRules(currentRTP, config.boardCount - i - 1);
            }
        }

        return boards;
    }

    /**
     * Generate a single board with target win amount
     */
    private async generateSingleBoard(targetWin: number, betSize: number): Promise<BoardResult> {
        const maxAttempts = 50;
        let bestBoard: IBoard | null = null;
        let bestCascadeSequence: CascadeSequence | null = null;
        let bestTotalWin = 0;
        let bestDistance = Infinity;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const initialBoard = this.boardGenerator.generate();
            const cascadeSequence = this.simulateFullCascade(initialBoard, betSize);

            const distance = Math.abs(cascadeSequence.totalWin - targetWin);

            if (distance < bestDistance || bestBoard === null) {
                bestBoard = initialBoard;
                bestCascadeSequence = cascadeSequence;
                bestTotalWin = cascadeSequence.totalWin;
                bestDistance = distance;

                // If we're close enough to target, use this board
                if (distance <= betSize * 0.1) {
                    // Within 10% of bet
                    break;
                }
            }
        }

        // Calculate final payout result for the entire cascade
        const finalPayoutResult = this.payoutCalculator.calculatePayout(bestCascadeSequence!.finalBoard, bestBoard!.multipliers, betSize);

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
    private simulateFullCascade(initialBoard: IBoard, betSize: number, accumulatedMultiplier: number = 0): CascadeSequence {
        let currentBoard = clone(initialBoard.newBoard);
        let currentMultipliers = clone(initialBoard.multipliers);
        let totalWin = 0;
        const cascades: CascadeSequence["cascades"] = [];
        const maxCascades = 10; // Prevent infinite loops
        let triggeredFreeSpin = false;
        let freeSpinsAwarded = 0;

        for (let cascadeLevel = 0; cascadeLevel < maxCascades; cascadeLevel++) {
            const payoutResult = this.payoutCalculator.calculatePayout(currentBoard, currentMultipliers, betSize, accumulatedMultiplier);

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
                const cascadeResult = this.boardGenerator.explodeAndRefill(currentBoard, payoutResult.winningSymbols, currentMultipliers);

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
     * Export chain results to JSON format
     */
    exportChainToJSON(chain: ResultChain): string {
        const exportData = {
            metadata: {
                generated: new Date().toISOString(),
                config: chain.config,
                stats: chain.generationStats,
                rtpResult: chain.rtpResult,
            },
            boards: chain.boards.map((board, index) => ({
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
     * Load chain from JSON format
     */
    loadChainFromJSON(jsonData: string): ResultChain {
        const data = JSON.parse(jsonData);

        // Reconstruct board results
        const boards: BoardResult[] = data.boards.map((boardData: any) => ({
            board: boardData.board,
            multipliers: boardData.multipliers,
            payoutResult: {
                totalWin: boardData.totalWin,
                symbolWins: boardData.symbolWins || [],
                scatterWin: boardData.scatterWin,
                winningSymbols: [],
                multiplierOrbValue: 0,
                triggersFreeSpin: false,
                freeSpinsAwarded: 0,
            },
            cascadeCount: boardData.cascadeCount,
            totalCascadeWin: boardData.totalWin,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0,
        }));

        return {
            config: data.metadata.config,
            boards,
            rtpResult: data.metadata.rtpResult,
            generationStats: data.metadata.stats,
        };
    }

    /**
     * Generate quick demo chain for testing
     */
    generateDemoChain(): Promise<ResultChain> {
        const demoConfig: ResultChainConfig = {
            boardCount: 10, // Small for quick testing
            targetRTP: 0.97,
            betSize: 1,
            playerBudget: 100,
            difficulty: Difficulty.Medium,
            maxRetries: 5,
            tolerance: 0.05, // More lenient for demo
        };

        return this.generateChain(demoConfig);
    }
}
