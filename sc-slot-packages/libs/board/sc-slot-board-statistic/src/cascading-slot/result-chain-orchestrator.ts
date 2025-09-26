// Import external calculators the same way statistic-runner does
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
import { prop } from "ramda";
import { RTPController, RTPConfiguration, RTPResult, BoardResult } from "./rtp-controller.js";
import { Round } from "./statistic-calculator.js";
import { commonDefinition, defaultOdds } from "./generator-definition.js";
import { Difficulty } from "sc-slot-board-generator";
import { ChainValidator } from "./chain-validator.js";
import { BoardEnhancementOrchestrator } from "./enhancement/board-enhancement-orchestrator.js";

// Import board generator from the other package
// Note: This will require adding sc-slot-board-generator as dependency
export interface ResultChainConfig {
    boardCount: number; // Number of boards in chain (100-150)
    targetRTP: number; // Target RTP (0.97 = 97%)
    difficulty: Difficulty; // Game difficulty
    maxRetries: number; // Max attempts to generate valid chain
    tolerance: number; // RTP tolerance (±%)
    betLevel?: number; // Bet level multiplier (0.1-10.0, default: 0.5)
    coinValue?: number; // Coin value in currency (0.01-1.0, default: 0.1)
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
    private readonly enhancementOrchestrator: BoardEnhancementOrchestrator;
    private roundCalculator?: RoundCalculator;

    constructor(
        private boardGeneratorFactory: () => BoardGeneratorInterface,
        rtpConfig: RTPConfiguration
    ) {
        this.rtpController = new RTPController(rtpConfig);
        this.enhancementOrchestrator = new BoardEnhancementOrchestrator();
    }

    /**
     * Calculate bet amounts from bet configuration
     */
    private calculateBetAmounts(config: ResultChainConfig): { baseBetAmount: number; totalBetAmount: number } {
        const coinValue = config.coinValue || 0.1;
        const betLevel = config.betLevel || 0.5;
        const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
        
        const baseBetAmount = coinValue * betLevel;
        const totalBetAmount = baseBetAmount * betMultiplier;
        
        return { baseBetAmount, totalBetAmount };
    }

    /**
     * Generate result chain with RTP validation and retries
     */
    async generateResultChain(config: ResultChainConfig): Promise<ResultChain> {
        const startTime = Date.now();
        let bestChain: BoardResult[] = [];
        let bestRTP = 0;
        let attempts = 0;


        // Calculate bet amounts from configuration
        const { totalBetAmount } = this.calculateBetAmounts(config);

        // Update RTP controller with new config
        this.rtpController.updateConfig({
            targetRTP: config.targetRTP,
            tolerance: config.tolerance,
            boardCount: config.boardCount,
            betSize: totalBetAmount,
            playerBudget: config.boardCount * totalBetAmount, // Legacy parameter (unused)
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

        // 🎯 VALIDATION: Validate entire chain for free spin compliance
        ChainValidator.validateChainFreeSpinCompliance(bestChain);

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
                maxWin: Math.max(...bestChain.map(board => board.totalWin || board.totalTumbleWin || 0)),
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
        const { totalBetAmount } = this.calculateBetAmounts(config);

        for (let i = 0; i < config.boardCount; i++) {
            const shouldWin = this.rtpController.shouldNextBoardWin(boards);
            const targetWinSize = shouldWin ? this.rtpController.getTargetWinSize(boards) : 0;

            const boardResult = await this.generateSingleBoard(targetWinSize, totalBetAmount, i, config);
            boards.push(boardResult);

            // Adjust strategy if we're drifting from target
            if (i % 20 === 19) {
                // Adjust every 20 boards
                const currentRTP = boards.length > 0 
                    ? boards.reduce((sum, board) => sum + (board.totalWin || board.totalTumbleWin || 0), 0) / (boards.length * totalBetAmount) 
                    : 0;
                
                console.log(`📈 Progress: ${i + 1}/${config.boardCount} boards, current RTP: ${(currentRTP * 100).toFixed(2)}%`);
            }
        }

        return boards;
    }

    /**
     * Generate a single board with settlement processing
     */
    private async generateSingleBoard(targetWin: number, betSize: number, boardId: number, config: ResultChainConfig): Promise<BoardResult> {
        const maxAttempts = 50;
        let bestBoard: BoardResult | null = null;
        let bestDistance = Infinity;

        const boardGenerator = this.boardGeneratorFactory();
        const startTime = Date.now();
        const maxTimeMs = 30000; // 30 second timeout per board

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Check timeout
            if (Date.now() - startTime > maxTimeMs) {
                console.warn(`⚠️  Board ${boardId} generation timeout after ${attempt} attempts`);
                break;
            }
            let initialBoard = boardGenerator.generate();
            
            // ✅ TRUST BOARDGENERATOR: Use its multipliers directly - they are generated based on the board
            
            // 🎯 FIX FOR EMPTY TUMBLES: If target win > 0, ensure board has winning symbols
            if (targetWin > 0) {
                initialBoard = await this.enhanceBoardForTargetWin(initialBoard, targetWin, betSize);
                // ✅ Board enhancement handles multipliers internally
            }
            
            // Create round for settlement processing using config bet parameters
            const coinValue = config.coinValue || 0.1;
            const betLevel = config.betLevel || 0.5;
            const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
            
            // Use actual config values for the round
            const totalAmount = coinValue * betLevel * betMultiplier;
            
            const round: Round = {
                id: boardId,
                coinValue,
                betLevel,
                betMultiplier,
                totalAmount: totalAmount, // Use calculated bet size with correct parameters
                odds: {
                    oddsByCounts: Object.assign({}, defaultOdds.normalSymbols.map(prop("payout"))),
                    freeSpins: defaultOdds.freeSpins,
                },
            };

            try {
                // Process settlement using external calculator
                const boardResult = await this.processSettlement(initialBoard, round, betSize);
                
                const distance = Math.abs((boardResult.totalWin || boardResult.totalTumbleWin || 0) - targetWin);

                if (distance < bestDistance || bestBoard === null) {
                    bestBoard = boardResult;
                    bestDistance = distance;

                    // If we're close enough to target, use this board
                    if (distance <= betSize * 0.1) {
                        // Within 10% of bet
                        break;
                    }
                }
            } catch (error) {
                console.warn(`⚠️  Board ${boardId} attempt ${attempt} failed:`, error.message);
                // Continue to next attempt
                continue;
            }
        }

        return bestBoard!;
    }



    /**
     * Process settlement using preGeneratedResult approach (guide-compliant)
     */
    private async processSettlement(
        initialBoard: { newBoard: number[]; multipliers: number[] },
        round: Round,
        betSize: number
    ): Promise<BoardResult> {
        // Calculate bet details for chain data and correct payout calculations
        const coinValue = round.coinValue || 0.1;
        const betLevel = round.betLevel || 0.5;
        const betMultiplier = round.betMultiplier || commonDefinition.betSettings.defaultBetMultiplier;
        const baseBetAmount = coinValue * betLevel;
        
        // Use internal board processing instead of external calculator to ensure board continuity
        const tumbleProcessingResult = await this.processTumblesWithBoardGenerator(
            initialBoard.newBoard,
            initialBoard.multipliers || [],
            betSize, // totalBetAmount (for RTP calculations)
            baseBetAmount // baseBetAmount (for payout calculations)
        );
        
        let tumbles = tumbleProcessingResult.tumbles;
        const totalWin = tumbleProcessingResult.totalWin;
        
        // 🎯 FIXED: Extract final multipliers from last tumble (BoardGenerator's final state)
        const finalTumbleMultipliers = tumbles.length > 0 
            ? tumbles[tumbles.length - 1].multipliers || []
            : initialBoard.multipliers || [];
        
        // 🎯 FIX: Follow guide patterns exactly - no extra "initial" tumbles
        if (tumbles.length === 0 || totalWin === 0) {
            // Pattern 1: No-win board - single tumble with no cascade data
            tumbles = [{
                icons: {},
                originalBoard: initialBoard.newBoard.join(','),
                newBoard: initialBoard.newBoard.join(','), // Same as original (no changes)
                multipliers: initialBoard.multipliers || [],
                win: 0
            }];
           
        }
        
        let freeSpinWins = 0;
        let totalFreeSpinsPlayed = 0;
        let freeSpinBoardSequence: any[] = [];

        // Execute free spins if awarded (following guide requirements)
        const scatterCount = this.countScatterSymbols(initialBoard.newBoard);
        const freeSpinsAwarded = this.calculateFreeSpinAward(scatterCount, false); // Base game award
        
        // 🎯 FIX: Execute free spins if awarded
        if (freeSpinsAwarded > 0) {
            console.log(`🎰 Executing ${freeSpinsAwarded} free spins awarded from ${scatterCount} scatters`);
            const freeSpinResults = await this.executeFreeSpins(round, freeSpinsAwarded);
            totalFreeSpinsPlayed = freeSpinResults.totalSpinsPlayed;
            freeSpinWins = freeSpinResults.totalWins;
            freeSpinBoardSequence = freeSpinResults.freeSpinBoards;
            console.log(`✅ Free spins completed: ${totalFreeSpinsPlayed} spins played, ${freeSpinWins} total wins`);
        }
        
        // 🎯 UPDATED: Calculate board multiplier sum using accumulated values from tumbles (pure function)
        const boardMultiplierSum = ResultChainOrchestrator.calculateMultiplierSum(finalTumbleMultipliers);
        const rawTumbleWin = totalWin + freeSpinWins; // Raw wins before multipliers
        const finalTotalWin = boardMultiplierSum > 0 ? rawTumbleWin * boardMultiplierSum : rawTumbleWin;
        
        const boardResult = {
            board: initialBoard.newBoard,
            multipliers: finalTumbleMultipliers, // 🎯 FIXED: Use final BoardGenerator multiplier state
            payoutResult: undefined,
            cascadeCount: tumbles.length,
            totalCascadeWin: totalWin,
            isFreeSpin: round.freeSpin || false,
            accumulatedMultiplier: round.multiplier || 0,
            remainingFreeSpins: 0,
            freeSpinsPlayed: totalFreeSpinsPlayed,
            freeSpinWins,
            freeSpinBoards: freeSpinBoardSequence.length > 0 ? freeSpinBoardSequence : undefined,
            settlementResult: {
                tumbles: tumbles,
                freeSpins: { count: scatterCount, odds: freeSpinsAwarded },
                additionalFreeSpins: { count: 0, odds: 0 }
            },
            totalTumbleWin: rawTumbleWin,           // Raw tumble wins (base game + free spins)
            boardMultiplierSum: boardMultiplierSum, // Sum of board multipliers
            totalWin: finalTotalWin,                // Final win with board multipliers applied
            // Include bet data for stake flexibility
            betLevel: round.betLevel,
            coinValue: round.coinValue,
            betMultiplier: round.betMultiplier,
            betAmount: (round.coinValue || 0.1) * (round.betLevel || 0.5) * (round.betMultiplier || commonDefinition.betSettings.defaultBetMultiplier)
        };
        
        // 🎯 VALIDATION: Ensure generated data follows guide patterns
        ChainValidator.validateTumblePatterns(tumbles, totalWin);
        ChainValidator.validateFreeSpinAwards(boardResult, round.freeSpin || false);
        
        return boardResult;
    }



    /**
     * Process tumbles using BoardGenerator and convert to proper cascading slot format
     * Following guide requirements for multiplier accumulation
     */
    private async processTumblesWithBoardGenerator(
        initialBoard: number[], 
        initialMultipliers: number[], 
        totalBetAmount: number,
        baseBetAmount: number
    ): Promise<{ tumbles: any[], totalWin: number }> {
        const boardGenerator = this.boardGeneratorFactory();
        const tumbles: any[] = [];
        let currentBoard = [...initialBoard];
        let currentMultipliers = [...initialMultipliers];
        
        // 🎯 FIXED: Trust BoardGenerator completely - no manual accumulation needed
        // BoardGenerator.explodeAndRefill() returns ALL multipliers in correct position-based order
        let totalWin = 0;
        
        // Maximum tumble iterations to prevent infinite loops
        const maxTumbles = 10;
        
        for (let tumbleIndex = 0; tumbleIndex < maxTumbles; tumbleIndex++) {
            // Detect winning symbols on current board
            const winSymbols = this.detectWinningSymbols(currentBoard);
            
            if (winSymbols.length === 0) {
                break; // No more wins, stop tumbling
            }
            
            // Use production BoardGenerator.explodeAndRefill with correct multipliers
            const tumbleResult = boardGenerator.explodeAndRefill(
                currentBoard, 
                winSymbols, 
                currentMultipliers
            );
            
            // ✅ TRUST BOARDGENERATOR: Use its multipliers directly - they are position-based and complete
            // BoardGenerator handles cascading physics, position ordering, and multiplier arrangement internally
            
            // 🔍 VERIFICATION: Log multiplier state for debugging
            if (tumbleResult.multipliers.length > 0) {
                console.log(`🎯 Tumble ${tumbleIndex + 1}: BoardGenerator multipliers: [${tumbleResult.multipliers.join(', ')}] (Sum: ${ResultChainOrchestrator.calculateMultiplierSum(tumbleResult.multipliers)})`);
            }
            
            // Calculate win for this tumble using correct payout rules with actual symbol counts
            const tumbleWin = this.calculateTumbleWin(winSymbols, baseBetAmount, currentBoard);
            totalWin += tumbleWin;
            
            // Create tumble data with correct multiplier context
            const tumbleData = {
                originalBoard: currentBoard.join(','),
                newBoard: tumbleResult.newBoard.join(','),
                explodedSymbols: tumbleResult.explodedSymbols,     // ✅ CORRECT: -1 for not exploded, symbol value for exploded
                newSymbols: tumbleResult.newSymbols,               // ✅ Keep BoardGenerator cascading physics
                multipliers: [...currentMultipliers],              // 🎯 FIXED: Use multipliers for originalBoard, not newBoard
                icons: this.createIconsData(winSymbols, tumbleWin, currentBoard, baseBetAmount),
                win: tumbleWin
            };
            
            tumbles.push(tumbleData);
            
            // Update board state for next tumble
            currentBoard = tumbleResult.newBoard;
            currentMultipliers = tumbleResult.multipliers || [];
        }
        
        // 🎯 FIX: Add final tumble for cascading wins (Pattern 2 compliance)
        if (tumbles.length > 0 && totalWin > 0) {
            // Add final tumble showing the board state after last cascade with no more wins
            const finalTumble = {
                icons: {}, // No more wins
                originalBoard: currentBoard.join(','),
                newBoard: currentBoard.join(','), // No further changes
                multipliers: [...currentMultipliers], // 🎯 FIXED: Use final BoardGenerator multiplier state
                win: 0
                // No explodedSymbols or newSymbols properties
            };
            tumbles.push(finalTumble);
        }
        
        return { tumbles, totalWin };
    }

    /**
     * 🎯 ENHANCED BOARD PROCESSING: Use new modular system for target win achievement
     */
    private async enhanceBoardForTargetWin(board: { newBoard: number[]; multipliers: number[] }, targetWin: number, totalBetAmount: number): Promise<{ newBoard: number[]; multipliers: number[] }> {
        const enhancementStart = Date.now();
        const maxEnhancementTime = 10000;
        
        const targetMultiplier = targetWin / totalBetAmount;
        const multiplierSum = ResultChainOrchestrator.calculateMultiplierSum(board.multipliers);
        const isSignificantWin = targetWin > totalBetAmount * 2;
        
        if (isSignificantWin) {
            console.log(`🎯 Enhancing board: target ${targetWin.toFixed(2)} (${targetMultiplier.toFixed(1)}x), multipliers sum: ${multiplierSum}`);
        }
        
        try {
            const enhancementRequest = {
                board: [...board.newBoard],
                multipliers: [...board.multipliers],
                targetWin: targetWin,
                totalBetAmount,
                maxEnhancementTime
            };
            
            const result = await this.enhancementOrchestrator.enhanceBoard(enhancementRequest);
            
            if (isSignificantWin) {
                console.log(`   ✅ Enhancement: ${result.strategy} (${result.actualMultiplier.toFixed(1)}x achieved)`);
                result.symbolsPlaced.forEach(placement => {
                    console.log(`   🔧 ${placement.reason}`);
                });
            }
            
            return {
                newBoard: result.enhancedBoard,
                multipliers: result.enhancedMultipliers
            };
            
        } catch (error) {
            const duration = Date.now() - enhancementStart;
            console.warn(`⚠️  Enhancement failed after ${duration}ms: ${error.message}`);
            
            return {
                newBoard: [...board.newBoard],
                multipliers: [...board.multipliers]
            };
        }
    }

    /**
     * Analyze board state for intelligent symbol placement with enhanced near-win detection
     */
    private analyzeBoard(board: number[]): {
        symbolCounts: { [symbol: number]: number };
        winningSymbols: number[];
        nearWinSymbols: { symbol: number; count: number; needed: number; priority: number; expectedPayout: number }[];
        emptyPositions: number[];
        winPotential: 'none' | 'low' | 'medium' | 'high';
        boardDensity: number;
        symbolDistribution: { [reel: number]: number[] };
    } {
        const symbolCounts: { [symbol: number]: number } = {};
        const emptyPositions: number[] = [];
        
        // Count symbols and find empty positions
        board.forEach((symbol, position) => {
            if (symbol === -1 || symbol === null || symbol === undefined) {
                emptyPositions.push(position);
            } else if (symbol >= 0 && symbol <= 10) {
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });
        
        // Identify winning symbols (8+)
        const winningSymbols: number[] = [];
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 8) {
                winningSymbols.push(parseInt(symbol));
            }
        });
        
        // Enhanced near-win symbols analysis (4-7 count with priority scoring)
        const nearWinSymbols: { symbol: number; count: number; needed: number; priority: number; expectedPayout: number }[] = [];
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 4 && count <= 7) {
                const symbolNum = parseInt(symbol);
                const needed = 8 - count;
                const expectedPayout = this.getSymbolOdds(symbolNum, 8); // Base payout for 8 symbols
                
                // Priority calculation: closer to win + higher payout = higher priority
                const distanceFactor = (8 - needed) / 4; // 0.25 to 1.0
                const payoutFactor = Math.min(expectedPayout / 100, 1); // Normalize high payouts
                const priority = distanceFactor * 0.7 + payoutFactor * 0.3;
                
                nearWinSymbols.push({
                    symbol: symbolNum,
                    count: count,
                    needed: needed,
                    priority: priority,
                    expectedPayout: expectedPayout
                });
            }
        });
        
        // Sort by priority (highest first)
        nearWinSymbols.sort((a, b) => b.priority - a.priority);
        
        // Enhanced win potential calculation
        let winPotential: 'none' | 'low' | 'medium' | 'high' = 'none';
        if (winningSymbols.length > 0) {
            winPotential = 'high';
        } else if (nearWinSymbols.length >= 3 || nearWinSymbols.some(s => s.needed <= 2)) {
            winPotential = 'medium';
        } else if (nearWinSymbols.length >= 1) {
            winPotential = 'low';
        }
        
        // Calculate board density and symbol distribution
        const filledPositions = board.filter(s => s >= 0 && s <= 10).length;
        const boardDensity = filledPositions / board.length;
        
        // Analyze symbol distribution across reels (6 reels × 5 symbols)
        const symbolDistribution: { [reel: number]: number[] } = {};
        const reelWidth = 5;
        for (let reel = 0; reel < 6; reel++) {
            symbolDistribution[reel] = [];
            for (let pos = 0; pos < reelWidth; pos++) {
                const boardIndex = reel * reelWidth + pos;
                if (boardIndex < board.length) {
                    symbolDistribution[reel].push(board[boardIndex]);
                }
            }
        }
        
        return {
            symbolCounts,
            winningSymbols,
            nearWinSymbols,
            emptyPositions,
            winPotential,
            boardDensity,
            symbolDistribution
        };
    }

    /**
     * Determine optimal symbol and count for target win based on actual defaultOdds
     */
    private determineTargetSymbolForWin(targetMultiplier: number, analysis: any): { symbol: number, count: number } {
        // If there are near-wins, build on the closest one
        if (analysis.nearWinSymbols.length > 0) {
            const closestNearWin = analysis.nearWinSymbols.sort((a, b) => a.needed - b.needed)[0];
            
            // Calculate how many symbols needed to reach target multiplier
            const symbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === closestNearWin.symbol);
            if (symbolConfig) {
                // Try different symbol counts to find best match
                for (let count = 8; count <= 15; count++) {
                    const odds = this.getSymbolOdds(closestNearWin.symbol, count);
                    const multiplier = odds / commonDefinition.betSettings.defaultBetMultiplier;
                    if (multiplier >= targetMultiplier * 0.8) { // Within 80% of target
                        return { symbol: closestNearWin.symbol, count };
                    }
                }
            }
            
            // Fallback: add extra symbols based on multiplier
            const extraSymbols = Math.ceil(targetMultiplier / 2);
            return {
                symbol: closestNearWin.symbol,
                count: Math.min(8 + extraSymbols, 15)
            };
        }
        
        // Choose symbol and count based on target multiplier using actual odds
        return this.findOptimalSymbolForMultiplier(targetMultiplier);
    }

    /**
     * Find optimal symbol and count combination for target multiplier
     */
    private findOptimalSymbolForMultiplier(targetMultiplier: number): { symbol: number, count: number } {
        const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
        const targetOdds = targetMultiplier * betMultiplier;
        
        let bestMatch = { symbol: 0, count: 8, distance: Infinity };
        
        // Test all symbols and counts to find best match
        for (let symbol = 0; symbol <= 8; symbol++) {
            const symbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === symbol);
            if (!symbolConfig) continue;
            
            // Test different symbol counts
            for (let count = 8; count <= 15; count++) {
                const odds = this.getSymbolOdds(symbol, count);
                const distance = Math.abs(odds - targetOdds);
                
                if (distance < bestMatch.distance) {
                    bestMatch = { symbol, count, distance };
                }
            }
        }
        
        // Fallback logic for specific multiplier ranges if no good match found
        if (bestMatch.distance > targetOdds * 0.5) {
            if (targetMultiplier >= 20.0) {
                return { symbol: 8, count: 8 };      // Premium symbol: 200x base
            } else if (targetMultiplier >= 10.0) {
                return { symbol: 7, count: 8 };      // High symbol: 50x base
            } else if (targetMultiplier >= 5.0) {
                return { symbol: 6, count: 8 };      // Medium-high: 40x base
            } else if (targetMultiplier >= 2.0) {
                return { symbol: 5, count: 8 };      // Medium: 30x base
            } else if (targetMultiplier >= 1.0) {
                return { symbol: 3, count: 8 };      // Low-medium: 16x base
            } else {
                return { symbol: 1, count: 8 };      // Low: 8x base
            }
        }
        
        return bestMatch;
    }

    /**
     * Place winning symbols strategically on board
     */
    private placeWinningSymbols(board: number[], targetSymbol: number, targetCount: number): number[] {
        const newBoard = [...board];
        let placedCount = 0;
        
        // Count existing instances of target symbol
        const existingCount = newBoard.filter(symbol => symbol === targetSymbol).length;
        const needToPlace = Math.max(0, targetCount - existingCount);
        
        // Find available positions (prefer spreading across reels)
        const availablePositions: number[] = [];
        for (let i = 0; i < newBoard.length; i++) {
            // Can place on any position, but prefer non-target symbols
            if (newBoard[i] !== targetSymbol) {
                availablePositions.push(i);
            }
        }
        
        // Place symbols across different reels for realistic patterns
        const reelWidth = 5;
        const reelCount = 6;
        let positioned = 0;
        
        // Try to place symbols across different reels
        for (let reel = 0; reel < reelCount && positioned < needToPlace; reel++) {
            const reelPositions = availablePositions.filter(pos => Math.floor(pos / reelWidth) === reel);
            const symbolsPerReel = Math.min(
                Math.ceil(needToPlace / reelCount),
                reelPositions.length
            );
            
            for (let i = 0; i < symbolsPerReel && positioned < needToPlace; i++) {
                if (reelPositions[i] !== undefined) {
                    newBoard[reelPositions[i]] = targetSymbol;
                    positioned++;
                }
            }
        }
        
        // Fill remaining symbols randomly if needed
        while (positioned < needToPlace && availablePositions.length > positioned) {
            const randomPos = availablePositions[positioned];
            if (newBoard[randomPos] !== targetSymbol) {
                newBoard[randomPos] = targetSymbol;
                positioned++;
            }
        }
        
        return newBoard;
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
     * Following correct payout rules: payoutWin = baseBetAmount * winningSymbol[count].odds
     */
    private calculateTumbleWin(winSymbols: number[], baseBetAmount: number, board?: number[]): number {
        let totalWin = 0;
        
        // If board is provided, count actual symbols for accurate payout tiers
        if (board) {
            const symbolCounts: { [symbol: number]: number } = {};
            board.forEach(s => {
                if (winSymbols.includes(s)) {
                    symbolCounts[s] = (symbolCounts[s] || 0) + 1;
                }
            });
            
            // Calculate win for each unique winning symbol with its actual count
            Object.entries(symbolCounts).forEach(([symbol, count]) => {
                const symbolNum = parseInt(symbol);
                const symbolOdds = this.getSymbolOdds(symbolNum, count);
                totalWin += baseBetAmount * symbolOdds;
            });
        } else {
            // Fallback: use base odds for each symbol (backward compatibility)
            winSymbols.forEach(symbol => {
                const symbolOdds = this.getSymbolOdds(symbol);
                totalWin += baseBetAmount * symbolOdds;
            });
        }
        
        return totalWin;
    }

    /**
     * Get odds for a symbol using proper defaultOdds from generator-definition
     */
    private getSymbolOdds(symbol: number, symbolCount?: number): number {
        // Find the symbol in defaultOdds.normalSymbols
        const symbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === symbol);
        
        if (!symbolConfig) {
            return 0; // Symbol not found
        }
        
        // If symbol count is provided, find the appropriate payout tier
        if (symbolCount !== undefined) {
            for (const payoutRange of symbolConfig.payout) {
                if (symbolCount >= payoutRange.from && symbolCount <= payoutRange.to) {
                    return payoutRange.odds;
                }
            }
        }
        
        // Default: Use the base odds (8-9 symbols range) as the standard payout
        // This matches the minimum winning condition of 8+ symbols
        const basePayoutRange = symbolConfig.payout.find(p => p.from === 8);
        
        return basePayoutRange ? basePayoutRange.odds : 0;
    }

    /**
     * Count scatter symbols (symbol 9) on the board
     */
    private countScatterSymbols(board: number[]): number {
        return board.filter(symbol => symbol === 9).length;
    }

    /**
     * Calculate free spin award based on scatter count and game mode
     * Following guide requirements: initialOdds vs additionalOdds
     */
    private calculateFreeSpinAward(scatterCount: number, isRetrigger: boolean): number {
        if (scatterCount < 4) {
            return 0; // No free spins awarded
        }

        if (isRetrigger) {
            // Free spin retrigger mode - use additionalOdds
            // 4+ scatter symbols → 5 additional free spins (regardless of count)
            return 5;
        } else {
            // Base game mode - use initialOdds
            if (scatterCount === 4) return 3;   // 4 scatters → 3 free spins
            if (scatterCount === 5) return 6;   // 5 scatters → 6 free spins
            if (scatterCount >= 6) return 18;   // 6+ scatters → 18 free spins
        }

        return 0;
    }

    /**
     * Create icons data in the expected format
     * Note: This method needs baseBetAmount for correct win calculations
     */
    private createIconsData(winSymbols: number[], totalWin: number, board: number[], baseBetAmount: number = 0.05): { [symbol: string]: { count: number, odds: number, win: number } } {
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
            const odds = this.getSymbolOdds(symbol, count); // Use actual count for correct payout tier
            icons[symbol.toString()] = {
                count,
                odds,
                win: baseBetAmount * odds // Correct win calculation: baseBetAmount * odds
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
            isFreeSpin: boolean;  // Required property from guide
            accumulatedMultiplier: number;  // Total accumulated multiplier
            remainingFreeSpins: number;  // Free spins left after this round
            freeSpinsPlayed: number;  // Number of free spins played so far
            freeSpinWins: number;  // Number of winning free spin rounds
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
            isFreeSpin: boolean;  // Required property from guide
            accumulatedMultiplier: number;  // Total accumulated multiplier
            remainingFreeSpins: number;  // Free spins left after this round
            freeSpinsPlayed: number;  // Number of free spins played so far
            freeSpinWins: number;  // Number of winning free spin rounds
            cascadeCount: number;
            win: number;
            isRetrigger: boolean;
            retriggeredSpins?: number;
            spinsRemaining: number;
            spinIndex: number;
            settlementResult?: any;
        }> = [];

        if (!this.roundCalculator) {
            console.warn("⚠️  External calculator not available, using internal free spin simulation");
            return this.simulateFreeSpins(baseRound, freeSpinsCount);
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
            
            // Check for retrigger using correct logic
            const freeSpinScatterCount = this.countScatterSymbols(freeSpinBoard.newBoard);
            const retriggeredSpins = this.calculateFreeSpinAward(freeSpinScatterCount, true); // Retrigger mode
            
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

            // Capture the complete free spin board data (following guide format)
            freeSpinBoards.push({
                board: freeSpinBoard.newBoard,
                multipliers: freeSpinBoard.multipliers,
                isFreeSpin: true,  // Required property from guide
                accumulatedMultiplier: multiplier,  // Total accumulated multiplier
                remainingFreeSpins: spinsRemaining,  // Free spins left after this round
                freeSpinsPlayed: spinIndex,  // Number of free spins played so far
                freeSpinWins: win > 0 ? 1 : 0,  // Number of winning free spin rounds
                cascadeCount,
                win,
                isRetrigger: retriggeredSpins > 0,
                retriggeredSpins: retriggeredSpins > 0 ? retriggeredSpins : undefined,
                spinsRemaining,
                spinIndex,
                settlementResult: {
                    ...freeSpinRound.settlementResult,
                    freeSpins: {
                        count: freeSpinScatterCount,
                        odds: retriggeredSpins  // Free spins awarded (based on retrigger rules)
                    }
                }
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
     * Simulate free spins when external calculator is not available
     */
    private async simulateFreeSpins(
        baseRound: Round,
        freeSpinsCount: number
    ): Promise<{
        totalWins: number;
        totalSpinsPlayed: number;
        freeSpinBoards: Array<{
            board: number[];
            multipliers: number[];
            isFreeSpin: boolean;
            accumulatedMultiplier: number;
            remainingFreeSpins: number;
            freeSpinsPlayed: number;
            freeSpinWins: number;
            cascadeCount: number;
            win: number;
            isRetrigger: boolean;
            retriggeredSpins?: number;
            spinsRemaining: number;
            spinIndex: number;
            settlementResult?: any;
        }>;
    }> {
        console.log(`🎰 Simulating ${freeSpinsCount} free spins internally`);
        
        const freeSpinBoards: any[] = [];
        let totalWins = 0;
        let totalSpinsPlayed = 0;
        let accumulatedMultiplier = 0;
        let additionalFreeSpins = 0;

        for (let i = 0; i < freeSpinsCount; i++) {
            const spinIndex = totalSpinsPlayed + 1;
            const spinsRemaining = freeSpinsCount - i - 1 + additionalFreeSpins;
            
            // Generate a free spin board
            const boardGenerator = this.boardGeneratorFactory();
            const freeSpinBoard = boardGenerator.generate();
            
            // Process the board for wins
            const totalBetAmount = baseRound.totalAmount || 1;
            const baseBetAmount = totalBetAmount / 20; // Assuming standard 20x multiplier
            const tumbleResult = await this.processTumblesWithBoardGenerator(
                freeSpinBoard.newBoard,
                freeSpinBoard.multipliers,
                totalBetAmount,
                baseBetAmount
            );
            
            const win = tumbleResult.totalWin;
            totalWins += win;
            totalSpinsPlayed++;
            
            // Check for retriggers
            const scatterCount = this.countScatterSymbols(freeSpinBoard.newBoard);
            const retriggeredSpins = this.calculateFreeSpinAward(scatterCount, true); // Retrigger mode
            additionalFreeSpins += retriggeredSpins;
            
            // Update multiplier (simplified)
            if (win > 0) {
                accumulatedMultiplier += Math.floor(Math.random() * 10) + 5; // Random multiplier increase
            }
            
            freeSpinBoards.push({
                board: freeSpinBoard.newBoard,
                multipliers: freeSpinBoard.multipliers,
                isFreeSpin: true,
                accumulatedMultiplier,
                remainingFreeSpins: spinsRemaining,
                freeSpinsPlayed: spinIndex,
                freeSpinWins: win > 0 ? 1 : 0,
                cascadeCount: tumbleResult.tumbles.length,
                win,
                isRetrigger: retriggeredSpins > 0,
                retriggeredSpins: retriggeredSpins > 0 ? retriggeredSpins : undefined,
                spinsRemaining,
                spinIndex,
                settlementResult: {
                    tumbles: tumbleResult.tumbles,
                    freeSpins: {
                        count: scatterCount,
                        odds: retriggeredSpins
                    }
                }
            });
        }
        
        // Handle additional free spins from retriggers
        if (additionalFreeSpins > 0) {
            console.log(`🔄 Processing ${additionalFreeSpins} retriggered free spins`);
            const retriggeredResults = await this.simulateFreeSpins(baseRound, additionalFreeSpins);
            totalWins += retriggeredResults.totalWins;
            totalSpinsPlayed += retriggeredResults.totalSpinsPlayed;
            freeSpinBoards.push(...retriggeredResults.freeSpinBoards);
        }
        
        console.log(`✅ Free spin simulation complete: ${totalSpinsPlayed} spins, ${totalWins} total wins`);
        return Promise.resolve({ totalWins, totalSpinsPlayed, freeSpinBoards });
    }


    /**
     * Pure function: Calculate total multiplier sum from multiplier values
     * @param multiplierValues - Array of multiplier values
     * @returns Sum of all multiplier values
     */
    private static calculateMultiplierSum(multiplierValues: readonly number[]): number {
        return multiplierValues.reduce((sum, value) => sum + value, 0);
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
            difficulty: Difficulty.Easy,
            maxRetries: 3,
            tolerance: 0.1, // More lenient for small batches
            betLevel: 0.5,
            coinValue: 0.1,
        };

        return this.generateResultChain(testConfig);
    }

    /**
     * Export result chain to JSON with validation
     */
    exportResultChainToJSON(chain: ResultChain): string {
        // 🎯 VALIDATION: Re-validate chain before export
        console.log(`🔍 Validating chain before export...`);
        ChainValidator.validateCompleteChain(chain.boards);
        console.log(`✅ Chain validation passed - proceeding with export`);
        
        return this.generateChainJSON(chain);
    }

    /**
     * Generate JSON string from validated chain
     */
    private generateChainJSON(chain: ResultChain): string {
        // Use bet parameters from chain config (supports custom betLevel and coinValue)
        const betLevel = chain.config.betLevel || 0.5;
        const coinValue = chain.config.coinValue || 0.1;
        const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
        const betAmount = coinValue * betLevel * betMultiplier;
        
        const betData = {
            betLevel,
            coinValue, 
            betMultiplier,
            betAmount
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
                totalTumbleWin: board.totalTumbleWin || 0,        // Raw tumble wins (base + free spins)
                boardMultiplierSum: board.boardMultiplierSum || 0, // Sum of board multipliers
                totalWin: board.totalWin || board.totalTumbleWin || 0, // Final win with multipliers applied
                // Additional fields for debugging multiplier effects
                multiplierApplied: (board.boardMultiplierSum || 0) > 0,
                winMultiplier: (board.boardMultiplierSum || 0) > 0 ? (board.boardMultiplierSum || 0) : 1,
            })),
        };

        return JSON.stringify(exportData, null, 2);
    }
}
