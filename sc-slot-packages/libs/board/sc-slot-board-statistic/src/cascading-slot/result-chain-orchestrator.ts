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
                maxWin: Math.max(...bestChain.map(board => board.totalTumbleWin || 0)),
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
                    ? boards.reduce((sum, board) => sum + (board.totalTumbleWin || 0), 0) / (boards.length * config.betSize) 
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
            
            const distance = Math.abs((boardResult.totalTumbleWin || 0) - targetWin);

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
     * Process settlement using external calculator for proper wins + BoardGenerator for correct explodedSymbols
     */
    private async processSettlement(
        initialBoard: { newBoard: number[]; multipliers: number[] },
        round: Round,
        betSize: number
    ): Promise<BoardResult> {
        // Calculate bet details for chain data
        const coinValue = round.coinValue;
        const betLevel = round.betLevel;
        const betMultiplier = round.betMultiplier;

        if (this.externalCalculatorAvailable && this.roundCalculator) {
            // Use external calculator for proper settlement (business rules, wins, etc.)
            this.roundCalculator.processSpinning(round, 0);
            
            // Use external calculator's tumbles data as-is (it's already correct)
            const tumbles = round.settlementResult?.tumbles || [];
            
            let totalWin = round.betwin || 0;
            let freeSpinWins = 0;
            let totalFreeSpinsPlayed = 0;
            let freeSpinBoardSequence: any[] = [];

            // Execute free spins if awarded
            const freeSpinsAwarded = round.settlementResult?.freeSpins.odds || 0;
            if (freeSpinsAwarded > 0) {
                const freeSpinResults = await this.executeFreeSpins(round, freeSpinsAwarded);
                freeSpinWins = freeSpinResults.totalWins;
                totalFreeSpinsPlayed = freeSpinResults.totalSpinsPlayed;
                freeSpinBoardSequence = freeSpinResults.freeSpinBoards;
                totalWin += freeSpinWins;
            }

            return {
                board: initialBoard.newBoard,
                multipliers: initialBoard.multipliers,
                payoutResult: undefined,
                cascadeCount: 0, // Deprecated - keeping for compatibility but always 0  
                totalCascadeWin: 0, // DEPRECATED: Use totalTumbleWin instead
                isFreeSpin: round.freeSpin || false,
                accumulatedMultiplier: round.multiplier || 0,
                remainingFreeSpins: freeSpinsAwarded > 0 ? 0 : (round.settlementResult?.freeSpins.odds || 0),
                freeSpinsPlayed: totalFreeSpinsPlayed,
                freeSpinWins,
                freeSpinBoards: freeSpinBoardSequence.length > 0 ? freeSpinBoardSequence : undefined,
                settlementResult: {
                    tumbles: tumbles, // ✅ Use external calculator's correct tumbles data
                    freeSpins: round.settlementResult?.freeSpins || { count: 0, odds: 0 },
                    additionalFreeSpins: round.settlementResult?.additionalFreeSpins || { count: 0, odds: 0 }
                },
                totalTumbleWin: round.totalTumbleWin || totalWin, // Use external calculator's win amounts
                // Include bet data for stake flexibility
                betLevel,
                coinValue,
                betMultiplier,
                betAmount: coinValue * betLevel * betMultiplier
            };
        } else {
            // Fallback: simulate basic board result
            console.warn("⚠️  External calculator not available, using fallback");
            return this.simulateBoardResult(initialBoard, betSize);
        }
    }

    /**
     * Fix explodedSymbols in tumbles using BoardGenerator (for external calculator results)
     */
    private async fixExplodedSymbolsInTumbles(
        originalTumbles: any[], 
        initialBoard: number[], 
        initialMultipliers: number[]
    ): Promise<any[]> {
        const boardGenerator = this.boardGeneratorFactory();
        const fixedTumbles: any[] = [];
        let currentBoard = [...initialBoard];
        let currentMultipliers = [...initialMultipliers];

        for (const originalTumble of originalTumbles) {
            if (originalTumble.explodedSymbols && originalTumble.explodedSymbols.some((s: number) => s !== -1)) {
                // External calculator found winning symbols - extract them from exploded positions
                const winSymbols: number[] = [];
                const explodedPositions: number[] = [];
                
                originalTumble.explodedSymbols.forEach((symbol: number, position: number) => {
                    if (symbol !== -1) {
                        winSymbols.push(symbol);
                        explodedPositions.push(position);
                    }
                });

                // Get unique winning symbols
                const uniqueWinSymbols = [...new Set(winSymbols)];

                // Use BoardGenerator to get correct newBoard and newSymbols based on actual exploded positions
                const boardGeneratorResult = boardGenerator.explodeAndRefill(
                    currentBoard, 
                    uniqueWinSymbols, 
                    currentMultipliers
                );

                // Create fixed tumble keeping external calculator's exploded positions (which are correct)
                // but using BoardGenerator for newBoard and newSymbols
                const fixedTumble = {
                    ...originalTumble, // Keep all external calculator data (icons, win, etc.)
                    originalBoard: currentBoard.join(','),
                    newBoard: originalTumble.newBoard || boardGeneratorResult.newBoard.join(','), // Prefer external calc newBoard
                    explodedSymbols: originalTumble.explodedSymbols, // ✅ Keep external calculator's exploded positions (they know game rules)
                    newSymbols: boardGeneratorResult.newSymbols || originalTumble.newSymbols, // Use BoardGenerator newSymbols if available
                    multipliers: boardGeneratorResult.multipliers || currentMultipliers
                };

                fixedTumbles.push(fixedTumble);

                // Update board state for next tumble - use the actual new board from external calculator
                if (originalTumble.newBoard) {
                    currentBoard = originalTumble.newBoard.split(',').map(Number);
                } else {
                    currentBoard = boardGeneratorResult.newBoard;
                }
                currentMultipliers = boardGeneratorResult.multipliers || currentMultipliers;
            } else {
                // No wins - keep original tumble as-is but update board tracking
                fixedTumbles.push(originalTumble);
                if (originalTumble.newBoard) {
                    currentBoard = originalTumble.newBoard.split(',').map(Number);
                }
            }
        }

        return fixedTumbles;
    }

    /**
     * Fallback simulation when external calculator not available
     */
    private simulateBoardResult(initialBoard: { newBoard: number[]; multipliers: number[] }, betSize: number): BoardResult {
        return {
            board: initialBoard.newBoard,
            multipliers: initialBoard.multipliers,
            payoutResult: undefined,
            cascadeCount: 0,
            totalCascadeWin: 0, // DEPRECATED: Use totalTumbleWin instead
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0,
            freeSpinsPlayed: 0,
            freeSpinWins: 0,
            freeSpinBoards: undefined,
            settlementResult: {
                tumbles: [],
                freeSpins: { count: 0, odds: 0 },
                additionalFreeSpins: { count: 0, odds: 0 }
            },
            totalTumbleWin: 0,
            betLevel: 1,
            coinValue: 0.1,
            betMultiplier: 10,
            betAmount: 1
        };
    }

    /**
     * Process tumbles using BoardGenerator for correct explodedSymbols generation
     */
    private async processTumblesWithBoardGenerator(
        initialBoard: number[], 
        initialMultipliers: number[], 
        betSize: number
    ): Promise<{ tumbles: any[], totalWin: number }> {
        const boardGenerator = this.boardGeneratorFactory();
        const tumbles: any[] = [];
        let currentBoard = [...initialBoard];
        let currentMultipliers = [...initialMultipliers];
        let totalWin = 0;
        
        // Maximum tumble iterations to prevent infinite loops
        const maxTumbles = 10;
        
        for (let tumbleIndex = 0; tumbleIndex < maxTumbles; tumbleIndex++) {
            // Detect winning symbols on current board
            const winSymbols = this.detectWinningSymbols(currentBoard);
            
            if (winSymbols.length === 0) {
                break; // No more wins, stop tumbling
            }
            
            // Use BoardGenerator.explodeAndRefill for correct processing
            const tumbleResult = boardGenerator.explodeAndRefill(
                currentBoard, 
                winSymbols, 
                currentMultipliers
            );
            
            // Calculate win for this tumble
            const tumbleWin = this.calculateTumbleWin(winSymbols, betSize);
            totalWin += tumbleWin;
            
            // Create tumble data with correct explodedSymbols from BoardGenerator
            const tumbleData = {
                originalBoard: currentBoard.join(','),
                newBoard: tumbleResult.newBoard.join(','),
                explodedSymbols: tumbleResult.explodedSymbols, // ✅ Correct from BoardGenerator!
                newSymbols: tumbleResult.newSymbols,           // ✅ Correct from BoardGenerator!
                multipliers: tumbleResult.multipliers || [],
                icons: this.createIconsData(winSymbols, tumbleWin, currentBoard),
                win: tumbleWin
            };
            
            tumbles.push(tumbleData);
            
            // Update board state for next tumble
            currentBoard = tumbleResult.newBoard;
            currentMultipliers = tumbleResult.multipliers || [];
        }
        
        return { tumbles, totalWin };
    }

    /**
     * Detect winning symbols on the board (simplified but functional version)
     */
    private detectWinningSymbols(board: number[]): number[] {
        // Count each symbol on the 30-position board (6x5 grid)
        const symbolCounts: { [symbol: number]: number } = {};
        
        board.forEach(symbol => {
            if (symbol >= 0 && symbol <= 10) { // Normal symbols 0-10
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });
        
        // Return symbols with 8+ matches (business rule - cannot change)
        const winSymbols: number[] = [];
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 8) { // Business rule: minimum 8 symbols for win
                winSymbols.push(parseInt(symbol));
            }
        });
        
        return winSymbols;
    }

    /**
     * Calculate win amount for a tumble based on winning symbols
     */
    private calculateTumbleWin(winSymbols: number[], betSize: number): number {
        // Simple calculation based on symbol values and odds
        let totalWin = 0;
        
        winSymbols.forEach(symbol => {
            // Basic payout calculation (this should match the actual game rules)
            const baseOdds = this.getSymbolOdds(symbol);
            totalWin += baseOdds * betSize;
        });
        
        return totalWin;
    }

    /**
     * Get odds for a symbol (simplified version)
     */
    private getSymbolOdds(symbol: number): number {
        // Default odds for different symbols (this should match game configuration)
        const symbolOdds: { [symbol: number]: number } = {
            0: 5,   // Crown
            1: 8,   // Gem
            2: 10,  // Bell
            3: 16,  // Star
            4: 20,  // Diamond
            5: 15,  // Heart
            6: 40,  // Scatter
            7: 12,  // Wild
            8: 25,  // Bonus
            9: 18   // Special
        };
        
        return symbolOdds[symbol] || 5; // Default odds
    }

    /**
     * Create icons data in the expected format
     */
    private createIconsData(winSymbols: number[], totalWin: number, board: number[]): { [symbol: string]: { count: number, odds: number, win: number } } {
        const icons: { [symbol: string]: { count: number, odds: number, win: number } } = {};
        
        // Count actual symbols on board for accurate icons data
        const symbolCounts: { [symbol: number]: number } = {};
        board.forEach(symbol => {
            if (winSymbols.includes(symbol)) {
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });
        
        winSymbols.forEach(symbol => {
            const count = symbolCounts[symbol] || 5; // Actual count from board
            const odds = this.getSymbolOdds(symbol);
            icons[symbol.toString()] = {
                count,
                odds,
                win: odds * 0.05 // Base win calculation (should match game rules)
            };
        });
        
        return icons;
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
        // Extract bet data from first board (all boards have same bet settings)
        const sampleBoard = chain.boards[0];
        const betData = {
            betLevel: sampleBoard.betLevel || 1,
            coinValue: sampleBoard.coinValue || 0.1, 
            betMultiplier: sampleBoard.betMultiplier || 10,
            betAmount: sampleBoard.betAmount || 1
        };

        const exportData = {
            metadata: {
                generated: new Date().toISOString(),
                config: chain.config,
                stats: chain.generationStats,
                rtpResult: chain.rtpResult,
                tumbleStats: chain.tumbleStats,
                betData, // ✅ Move bet data to metadata
            },
            boards: chain.boards.map((board, index) => ({
                index,
                board: board.board,
                multipliers: board.multipliers,
                // ❌ Remove deprecated fields: cascadeCount, totalCascadeWin
                settlementResult: board.settlementResult,
                totalTumbleWin: board.totalTumbleWin || 0, // ✅ Only include totalTumbleWin
            })),
        };

        return JSON.stringify(exportData, null, 2);
    }
}
