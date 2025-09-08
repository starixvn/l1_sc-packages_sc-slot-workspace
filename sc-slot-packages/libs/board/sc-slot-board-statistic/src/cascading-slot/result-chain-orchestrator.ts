// Import external calculators the same way statistic-runner does
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
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
    getUnderlyingGenerator(): any; // For external calculator integration
}

export class ResultChainOrchestrator {
    private readonly rtpController: RTPController;
    private roundCalculator?: RoundCalculator;
    private externalCalculatorAvailable: boolean;

    constructor(
        private boardGeneratorFactory: () => BoardGeneratorInterface,
        rtpConfig: RTPConfiguration
    ) {
        this.rtpController = new RTPController(rtpConfig);
        this.externalCalculatorAvailable = this.initializeExternalCalculator();
    }

    /**
     * Initialize external settlement calculator (same pattern as statistic-runner)
     */
    private initializeExternalCalculator(): boolean {
        try {
            console.log("🔄 Initializing external settlement calculator...");
            
            // Create calculator with our enhanced board generator configuration
            // Note: We need to create a new BoardGenerator with our enhanced settings
            const enhancedBoardGenerator = this.boardGeneratorFactory();
            const underlyingGenerator = enhancedBoardGenerator.getUnderlyingGenerator();
            
            this.roundCalculator = new RoundCalculator({
                boardGenerator: underlyingGenerator, // This should now use our enhanced definition
                tumbleCalculator: new TumbleCalculator(),
            });
            
            console.log("✅ External RoundCalculator initialized successfully");
            return true;
        } catch (error) {
            console.warn("⚠️  External calculator initialization failed:", error.message);
            console.warn("📋 Stack trace:", error.stack);
            return false;
        }
    }

    /**
     * Generate result chain with RTP validation and retries
     */
    async generateResultChain(config: ResultChainConfig): Promise<ResultChain> {
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
            
            // Create round for settlement processing (same format as statistic-runner)
            const coinValue = 0.1;
            const betMultiplier = 20;
            const betLevel = betSize / (coinValue * betMultiplier); // For $20 bet: 20 / (0.1 * 20) = 10
            
            const round: Round = {
                id: boardId,
                coinValue,
                betLevel,
                betMultiplier,
                totalAmount: coinValue * betLevel * betMultiplier, // 0.1 * 10 * 20 = 20 ✓
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
     * Process settlement using external calculator with immediate free spin execution
     */
    private async processSettlement(
        initialBoard: { newBoard: number[]; multipliers: number[] },
        round: Round,
        betSize: number
    ): Promise<BoardResult> {
        if (this.externalCalculatorAvailable && this.roundCalculator) {
            // Use external calculator for real settlement (same as statistic-runner spin function)
            this.roundCalculator.processSpinning(round, 0);
            
            // After processSpinning, round object is populated with:
            // - round.settlementResult (tumbles, freeSpins, etc.)
            // - round.betwin (total win amount)
            // - round.totalTumbleWin (tumble-specific wins)
            
            // Count only actual cascades (tumbles where symbols were removed and board changed)
            const cascadeCount = round.settlementResult?.tumbles?.filter(tumble => {
                // Type-safe access to explodedSymbols
                const explodedSymbols = (tumble as any).explodedSymbols;
                // Check if symbols were actually exploded/removed
                const symbolsExploded = explodedSymbols && 
                    explodedSymbols.some((pos: number) => pos !== -1);
                // Check if board actually changed
                const boardChanged = tumble.originalBoard !== tumble.newBoard;
                // Only count as cascade if both conditions are met
                return symbolsExploded && boardChanged;
            }).length || 0;
            let totalWin = round.betwin || 0;
            let freeSpinWins = 0;
            let totalFreeSpinsPlayed = 0;
            
            // Execute free spins immediately if awarded and capture all individual boards
            const freeSpinsAwarded = round.settlementResult?.freeSpins.odds || 0;
            let freeSpinBoardSequence: any[] = [];
            
            if (freeSpinsAwarded > 0) {
                const freeSpinResults = await this.executeFreeSpins(round, freeSpinsAwarded);
                freeSpinWins = freeSpinResults.totalWins;
                totalFreeSpinsPlayed = freeSpinResults.totalSpinsPlayed;
                freeSpinBoardSequence = freeSpinResults.freeSpinBoards;
                totalWin += freeSpinWins; // Include free spin wins in total
            }

            return {
                board: initialBoard.newBoard,
                multipliers: initialBoard.multipliers,
                payoutResult: undefined, // Not needed with real settlement result
                cascadeCount,
                totalCascadeWin: totalWin, // Now includes main game + free spin wins
                isFreeSpin: round.freeSpin || false,
                accumulatedMultiplier: round.multiplier || 0,
                remainingFreeSpins: freeSpinsAwarded > 0 ? 0 : (round.settlementResult?.freeSpins.odds || 0), // 0 if executed, original if not executed
                freeSpinsPlayed: totalFreeSpinsPlayed, // Track how many were actually played
                freeSpinWins, // Track separate free spin contribution
                freeSpinBoards: freeSpinBoardSequence.length > 0 ? freeSpinBoardSequence : undefined, // Complete free spin sequence
                settlementResult: round.settlementResult,
                totalTumbleWin: round.totalTumbleWin || (round.betwin || 0), // Keep original tumble wins separate
            };
        } else {
            // Fallback: simulate basic board result
            console.warn("⚠️  Using fallback settlement logic - results may be inaccurate");
            return this.simulateBoardResult(initialBoard, betSize);
        }
    }

    /**
     * Execute free spins immediately and capture all individual boards for complete player experience
     */
    private async executeFreeSpins(
        baseRound: Round, 
        freeSpinsCount: number
    ): Promise<{ 
        totalWins: number; 
        totalSpinsPlayed: number;
        freeSpinBoards: Array<{
            board: number[];
            multipliers: number[];
            cascadeCount: number;
            win: number;
            isRetrigger: boolean;
            retriggeredSpins?: number;
            spinsRemaining: number;
            spinIndex: number;
            settlementResult?: any;
        }>;
    }> {
        let totalWins = 0;
        let totalSpinsPlayed = 0;
        let additionalFreeSpins = 0;
        let multiplier = 0;
        const freeSpinBoards: Array<{
            board: number[];
            multipliers: number[];
            cascadeCount: number;
            win: number;
            isRetrigger: boolean;
            retriggeredSpins?: number;
            spinsRemaining: number;
            spinIndex: number;
            settlementResult?: any;
        }> = [];

        if (!this.roundCalculator) {
            console.warn("⚠️  Cannot execute free spins: roundCalculator not available");
            return { totalWins: 0, totalSpinsPlayed: 0, freeSpinBoards: [] };
        }

        for (let j = 0; j < freeSpinsCount; j++) {
            const spinIndex = totalSpinsPlayed + 1;
            const spinsRemaining = freeSpinsCount - j - 1 + additionalFreeSpins;
            
            const freeSpinRound: Round = {
                id: baseRound.id,
                freeSpinId: j,
                coinValue: baseRound.coinValue,
                betLevel: baseRound.betLevel,
                betMultiplier: baseRound.betMultiplier,
                totalAmount: 0,
                odds: baseRound.odds,
                freeSpin: true,
            };

            // Generate a new board for this free spin
            const freeSpinBoard = this.boardGeneratorFactory().generate();
            
            // Process the free spin with the generated board
            this.roundCalculator.processSpinning(freeSpinRound, 0);

            const win = freeSpinRound.betwin || 0;
            const retriggeredSpins = freeSpinRound.settlementResult?.freeSpins.odds || 0;
            
            // Count only actual cascades (tumbles where symbols were removed and board changed)
            const cascadeCount = freeSpinRound.settlementResult?.tumbles?.filter(tumble => {
                // Type-safe access to explodedSymbols
                const explodedSymbols = (tumble as any).explodedSymbols;
                // Check if symbols were actually exploded/removed
                const symbolsExploded = explodedSymbols && 
                    explodedSymbols.some((pos: number) => pos !== -1);
                // Check if board actually changed
                const boardChanged = tumble.originalBoard !== tumble.newBoard;
                // Only count as cascade if both conditions are met
                return symbolsExploded && boardChanged;
            }).length || 0;

            // Capture the complete free spin board data
            freeSpinBoards.push({
                board: freeSpinBoard.newBoard,
                multipliers: freeSpinBoard.multipliers,
                cascadeCount,
                win,
                isRetrigger: retriggeredSpins > 0,
                retriggeredSpins: retriggeredSpins > 0 ? retriggeredSpins : undefined,
                spinsRemaining,
                spinIndex,
                settlementResult: freeSpinRound.settlementResult
            });

            if (win > 0) {
                multiplier += freeSpinRound.multiplier || 0;
                totalWins += win;
            }

            totalSpinsPlayed++;

            // Check for additional free spins (retriggering)
            additionalFreeSpins += retriggeredSpins;
        }

        // Handle retriggered free spins recursively
        if (additionalFreeSpins > 0) {
            console.log(`🔄 Retriggered ${additionalFreeSpins} additional free spins`);
            const retriggeredResults = await this.executeFreeSpins(baseRound, additionalFreeSpins);
            totalWins += retriggeredResults.totalWins;
            totalSpinsPlayed += retriggeredResults.totalSpinsPlayed;
            
            // Append retriggered boards with updated spin indices
            retriggeredResults.freeSpinBoards.forEach(board => {
                freeSpinBoards.push({
                    ...board,
                    spinIndex: board.spinIndex + freeSpinBoards.length
                });
            });
        }

        return { totalWins, totalSpinsPlayed, freeSpinBoards };
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
