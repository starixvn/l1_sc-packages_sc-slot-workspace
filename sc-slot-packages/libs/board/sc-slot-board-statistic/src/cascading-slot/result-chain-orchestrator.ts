// Optional external calculator interfaces
interface ExternalRoundCalculator {
    processSpinning(round: Round, totalMultiplier?: number): void;
}

interface ExternalTumbleCalculator {
    // Interface for tumble calculator
}
import { prop } from "ramda";
import { RTPController, RTPConfiguration, RTPResult, BoardResult } from "./rtp-controller.js";
import { Round, Statistic, calculateStatistic } from "./statistic-calculator.js";
import { commonDefinition, defaultOdds } from "./generator-definition.js";
import { Difficulty } from "sc-slot-board-generator";

// Import board generator from the other package
// Note: This will require adding sc-slot-board-generator as dependency
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
    tumbleStats: {
        totalTumbles: number;
        averageTumblesPerRound: number;
        maxTumblesInRound: number;
        symbolDistribution: Record<number, number>;
    };
}

export interface BoardGeneratorInterface {
    generate(): { newBoard: number[]; multipliers: number[] };
    explodeAndRefill(board: number[], winSymbols: number[], oldMultipliers: number[]): { 
        newBoard: number[]; 
        multipliers: number[];
        explodedSymbols?: number[];
        newSymbols?: number[];
    };
}

export class ResultChainOrchestrator {
    private readonly rtpController: RTPController;
    private roundCalculator?: ExternalRoundCalculator;
    private readonly externalCalculatorAvailable: boolean;

    constructor(
        private boardGeneratorFactory: () => BoardGeneratorInterface,
        rtpConfig: RTPConfiguration
    ) {
        this.rtpController = new RTPController(rtpConfig);
        this.externalCalculatorAvailable = false; // Will be set by async init
    }

    /**
     * Initialize external settlement calculator
     */
    private async initializeExternalCalculator(): Promise<boolean> {
        try {
            // Try to dynamically import external calculators
            const roundCalcModule = await import("sc-cascading-slot-base/src/board/round-calculator");
            const tumbleCalcModule = await import("sc-cascading-slot-base/src/board/tumble-calculator");
            
            const RoundCalculator = roundCalcModule.default;
            const TumbleCalculator = tumbleCalcModule.default;
            
            // Try to create external calculator
            const boardGenerator = this.boardGeneratorFactory();
            this.roundCalculator = new RoundCalculator({
                boardGenerator: boardGenerator as any,
                tumbleCalculator: new TumbleCalculator(),
            });
            
            console.log("✅ External RoundCalculator initialized successfully");
            return true;
        } catch (error) {
            console.warn("⚠️  External calculator not available:", error.message);
            return false;
        }
    }

    /**
     * Generate result chain with RTP validation and retries
     */
    async generateResultChain(config: ResultChainConfig): Promise<ResultChain> {
        // Initialize external calculator if not already done
        if (!this.externalCalculatorAvailable) {
            (this as any).externalCalculatorAvailable = await this.initializeExternalCalculator();
        }
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

        console.log(`🎯 Generating result chain: ${config.boardCount} boards, target RTP: ${(config.targetRTP * 100).toFixed(1)}%`);

        for (attempts = 1; attempts <= config.maxRetries; attempts++) {
            console.log(`🔄 Attempt ${attempts}/${config.maxRetries}`);
            
            const chain = await this.generateSingleChain(config);
            const rtpResult = this.rtpController.validateRTP(chain);

            console.log(`📊 Attempt ${attempts}: RTP ${(rtpResult.actualRTP * 100).toFixed(2)}%, Target: ${(config.targetRTP * 100).toFixed(2)}%, Meets: ${rtpResult.meetsTarget ? '✅' : '❌'}`);

            if (rtpResult.meetsTarget) {
                bestChain = chain;
                bestRTP = rtpResult.actualRTP;
                console.log(`✅ Target RTP achieved on attempt ${attempts}!`);
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

        // Calculate tumble stats
        const tumbleStats = this.calculateTumbleStats(bestChain);

        console.log(`🏁 Generation complete: ${attempts} attempts, ${duration}ms, final RTP: ${(finalRtpResult.actualRTP * 100).toFixed(2)}%`);

        return {
            config,
            boards: bestChain,
            rtpResult: finalRtpResult,
            generationStats: {
                attempts,
                duration,
                finalRTP: finalRtpResult.actualRTP,
                averageWin: finalRtpResult.totalWins / config.boardCount,
                maxWin: Math.max(...bestChain.map(board => board.totalCascadeWin)),
                hitFrequency: finalRtpResult.hitFrequency,
            },
            tumbleStats,
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

            const boardResult = await this.generateSingleBoard(targetWinSize, config.betSize, i);
            boards.push(boardResult);

            // Adjust strategy if we're drifting from target
            if (i % 20 === 19) {
                // Adjust every 20 boards
                const currentRTP = boards.length > 0 
                    ? boards.reduce((sum, board) => sum + board.totalCascadeWin, 0) / (boards.length * config.betSize) 
                    : 0;
                
                console.log(`📈 Progress: ${i + 1}/${config.boardCount} boards, current RTP: ${(currentRTP * 100).toFixed(2)}%`);
            }
        }

        return boards;
    }

    /**
     * Generate a single board with settlement processing
     */
    private async generateSingleBoard(targetWin: number, betSize: number, boardId: number): Promise<BoardResult> {
        const maxAttempts = 50;
        let bestBoard: BoardResult | null = null;
        let bestDistance = Infinity;

        const boardGenerator = this.boardGeneratorFactory();

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const initialBoard = boardGenerator.generate();
            
            // Create round for settlement processing
            const round: Round = {
                id: boardId,
                coinValue: betSize,
                betLevel: 1,
                betMultiplier: 1,
                totalAmount: betSize,
                odds: {
                    oddsByCounts: Object.assign({}, defaultOdds.normalSymbols.map(prop("payout"))),
                    freeSpins: defaultOdds.freeSpins,
                },
            };

            // Process settlement using external calculator
            const boardResult = await this.processSettlement(initialBoard, round, betSize);
            
            const distance = Math.abs(boardResult.totalCascadeWin - targetWin);

            if (distance < bestDistance || bestBoard === null) {
                bestBoard = boardResult;
                bestDistance = distance;

                // If we're close enough to target, use this board
                if (distance <= betSize * 0.1) {
                    // Within 10% of bet
                    break;
                }
            }
        }

        return bestBoard!;
    }

    /**
     * Process settlement using external calculator
     */
    private async processSettlement(
        initialBoard: { newBoard: number[]; multipliers: number[] },
        round: Round,
        betSize: number
    ): Promise<BoardResult> {
        if (this.externalCalculatorAvailable && this.roundCalculator) {
            // Use external calculator for real settlement
            this.roundCalculator.processSpinning(round, 0);
            
            // Convert settlement result to BoardResult
            const cascadeCount = round.settlementResult?.tumbles.length || 0;
            const totalWin = round.betwin || 0;

            return {
                board: initialBoard.newBoard,
                multipliers: initialBoard.multipliers,
                payoutResult: undefined, // Not needed with settlement result
                cascadeCount,
                totalCascadeWin: totalWin,
                isFreeSpin: false,
                accumulatedMultiplier: 0,
                remainingFreeSpins: round.settlementResult?.freeSpins.odds || 0,
                settlementResult: round.settlementResult,
                totalTumbleWin: round.totalTumbleWin,
            };
        } else {
            // Fallback: simulate basic board result
            console.warn("⚠️  Using fallback settlement logic - results may be inaccurate");
            return this.simulateBoardResult(initialBoard, betSize);
        }
    }

    /**
     * Fallback settlement simulation (for when external calculator unavailable)
     */
    private simulateBoardResult(
        initialBoard: { newBoard: number[]; multipliers: number[] },
        betSize: number
    ): BoardResult {
        // Simple simulation - this should be replaced with real calculator
        const hasWin = Math.random() < 0.3; // 30% hit frequency
        const totalWin = hasWin ? betSize * (0.1 + Math.random() * 2) : 0; // 0.1x to 2x bet
        const cascadeCount = hasWin ? Math.floor(Math.random() * 3) + 1 : 0;

        return {
            board: initialBoard.newBoard,
            multipliers: initialBoard.multipliers,
            cascadeCount,
            totalCascadeWin: totalWin,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0,
            totalTumbleWin: totalWin,
        };
    }

    /**
     * Calculate tumble statistics from boards
     */
    private calculateTumbleStats(boards: BoardResult[]): ResultChain['tumbleStats'] {
        let totalTumbles = 0;
        let maxTumblesInRound = 0;
        const symbolDistribution: Record<number, number> = {};

        boards.forEach(board => {
            if (board.settlementResult?.tumbles) {
                const tumbleCount = board.settlementResult.tumbles.length;
                totalTumbles += tumbleCount;
                maxTumblesInRound = Math.max(maxTumblesInRound, tumbleCount);

                // Count symbols from tumbles
                board.settlementResult.tumbles.forEach(tumble => {
                    const symbols = tumble.originalBoard.split(',').map(s => parseInt(s));
                    symbols.forEach(symbol => {
                        symbolDistribution[symbol] = (symbolDistribution[symbol] || 0) + 1;
                    });
                });
            }
        });

        return {
            totalTumbles,
            averageTumblesPerRound: totalTumbles / boards.length,
            maxTumblesInRound,
            symbolDistribution,
        };
    }

    /**
     * Generate small test batch
     */
    async generateSmallTestBatch(rounds: number = 15): Promise<ResultChain> {
        const testConfig: ResultChainConfig = {
            boardCount: Math.min(Math.max(rounds, 10), 20),
            targetRTP: 0.97,
            betSize: 1,
            playerBudget: 100,
            difficulty: Difficulty.Easy,
            maxRetries: 3,
            tolerance: 0.1, // More lenient for small batches
        };

        return this.generateResultChain(testConfig);
    }

    /**
     * Export result chain to JSON
     */
    exportResultChainToJSON(chain: ResultChain): string {
        const exportData = {
            metadata: {
                generated: new Date().toISOString(),
                config: chain.config,
                stats: chain.generationStats,
                rtpResult: chain.rtpResult,
                tumbleStats: chain.tumbleStats,
            },
            boards: chain.boards.map((board, index) => ({
                index,
                board: board.board,
                multipliers: board.multipliers,
                totalWin: board.totalCascadeWin,
                cascadeCount: board.cascadeCount,
                settlementResult: board.settlementResult,
                totalTumbleWin: board.totalTumbleWin,
            })),
        };

        return JSON.stringify(exportData, null, 2);
    }
}
