import { SymbolPrioritizer, SymbolPriorityResult } from './symbol-prioritizer';
import { MultiSymbolStrategy, MultiSymbolResult } from './multi-symbol-strategy';
import { EnhancedBoardAnalyzer, EnhancedBoardAnalysis } from './enhanced-board-analyzer';

export interface EnhancementRequest {
    board: number[];
    multipliers: number[];
    targetWin: number;
    totalBetAmount: number;
    maxEnhancementTime?: number;
}

export interface EnhancementResult {
    enhancedBoard: number[];
    enhancedMultipliers: number[];
    strategy: 'single-symbol' | 'multi-symbol' | 'multiplier-boost'  | 'no-enhancement';
    symbolsPlaced: Array<{
        symbol: number;
        positions: number[];
        reason: string;
    }>;
    targetAchieved: boolean;
    actualMultiplier: number;
    enhancementTime: number;
    analysis: {
        boardAnalysis: EnhancedBoardAnalysis;
        symbolPriority: SymbolPriorityResult;
        multiSymbolResult?: MultiSymbolResult;
    };
}

/**
 * Main orchestrator for board enhancement using modular strategy system
 * Coordinates symbol prioritization, multi-symbol strategies, and intelligent placement
 */
export class BoardEnhancementOrchestrator {
    private readonly symbolPrioritizer: SymbolPrioritizer;
    private readonly multiSymbolStrategy: MultiSymbolStrategy;
    private readonly boardAnalyzer: EnhancedBoardAnalyzer;

    constructor() {
        this.symbolPrioritizer = new SymbolPrioritizer();
        this.multiSymbolStrategy = new MultiSymbolStrategy();
        this.boardAnalyzer = new EnhancedBoardAnalyzer();
    }

    /**
     * Main enhancement method - coordinates all enhancement strategies
     */
    async enhanceBoard(request: EnhancementRequest): Promise<EnhancementResult> {
        const startTime = Date.now();
        const maxTime = request.maxEnhancementTime || 10000; // 10 second default
        
        // Step 1: Analyze current board state
        const boardAnalysis = this.boardAnalyzer.analyzeBoard(request.board);
        
        // Early exit if board already has winning symbols
        if (boardAnalysis.winningSymbols.length > 0) {
            return this.createNoEnhancementResult(request, boardAnalysis, startTime, 'Board already has winning symbols');
        }

        // Step 2: Calculate target multiplier and board multiplier sum
        const targetMultiplier = request.targetWin / request.totalBetAmount;
        const boardMultiplierSum = request.multipliers.reduce((sum, mult) => sum + mult, 0);
        
        // Step 3: Prioritize symbols
        const symbolPriority = this.symbolPrioritizer.prioritizeSymbols(
            boardAnalysis.symbolCounts,
            targetMultiplier,
            boardMultiplierSum
        );

        // Step 4: Check timeout
        if (Date.now() - startTime > maxTime) {
            return this.createTimeoutResult(request, boardAnalysis, symbolPriority, startTime);
        }

        // Step 5: Determine enhancement strategy
        let enhancementResult: EnhancementResult;

        switch (symbolPriority.recommendedStrategy) {
            case 'single-symbol':
                enhancementResult = await this.applySingleSymbolStrategy(
                    request, 
                    boardAnalysis, 
                    symbolPriority, 
                    startTime, 
                    maxTime
                );
                break;

            case 'multi-symbol':
                enhancementResult = await this.applyMultiSymbolStrategy(
                    request, 
                    boardAnalysis, 
                    symbolPriority, 
                    startTime, 
                    maxTime
                );
                break;

            // case 'multiplier-boost':
            //     enhancementResult = await this.applyMultiplierBoostStrategy(
            //         request, 
            //         boardAnalysis, 
            //         symbolPriority, 
            //         startTime
            //     );
            //     break;

            // case 'multiplier-generation':
            //     enhancementResult = await this.applyMultiplierGenerationStrategy(
            //         request, 
            //         boardAnalysis, 
            //         symbolPriority, 
            //         startTime
            //     );
            //     break;

            default:
                enhancementResult = this.createNoEnhancementResult(
                    request, 
                    boardAnalysis, 
                    startTime, 
                    'No suitable enhancement strategy found'
                );
        }

        return enhancementResult;
    }

    /**
     * Apply single symbol enhancement strategy
     */
    private async applySingleSymbolStrategy(
        request: EnhancementRequest,
        boardAnalysis: EnhancedBoardAnalysis,
        symbolPriority: SymbolPriorityResult,
        startTime: number,
        maxTime: number
    ): Promise<EnhancementResult> {
        if (!symbolPriority.primarySymbol) {
            return this.createNoEnhancementResult(request, boardAnalysis, startTime, 'No primary symbol found');
        }

        const primarySymbol = symbolPriority.primarySymbol;
        const targetMultiplier = request.targetWin / request.totalBetAmount;
        
        // Find optimal symbol count for target
        const optimalTier = primarySymbol.payoutTiers.find(tier => 
            tier.multiplier >= targetMultiplier * 0.8
        ) || primarySymbol.payoutTiers[0];

        if (!optimalTier) {
            return this.createNoEnhancementResult(request, boardAnalysis, startTime, 'No suitable payout tier found');
        }

        const symbolsNeeded = Math.max(0, optimalTier.symbolCount - primarySymbol.count);
        
        // Check if we have enough positions
        if (symbolsNeeded > boardAnalysis.emptyPositions.length) {
            return this.createNoEnhancementResult(
                request, 
                boardAnalysis, 
                startTime, 
                `Need ${symbolsNeeded} positions, only ${boardAnalysis.emptyPositions.length} available`
            );
        }

        // Place symbols using intelligent placement (only in truly empty positions)
        // Note: boardAnalysis.emptyPositions excludes symbol 10s to preserve multiplier consistency
        const placementPositions = this.selectOptimalPositions(
            boardAnalysis,
            primarySymbol.symbol,
            symbolsNeeded
        );

        // Debug: Log symbol 10 preservation
        if (boardAnalysis.symbol10Positions.length > 0) {
            console.log(`🔒 Preserving ${boardAnalysis.symbol10Positions.length} symbol 10s at positions: [${boardAnalysis.symbol10Positions.join(', ')}]`);
        }

        const enhancedBoard = [...request.board];
        placementPositions.forEach(pos => {
            enhancedBoard[pos] = primarySymbol.symbol;
        });

        const actualMultiplier = optimalTier.multiplier;
        const targetAchieved = actualMultiplier >= targetMultiplier * 0.8;

        return {
            enhancedBoard,
            // Multipliers array remains unchanged since we don't modify symbol 10 positions
            enhancedMultipliers: [...request.multipliers],
            strategy: 'single-symbol',
            symbolsPlaced: [{
                symbol: primarySymbol.symbol,
                positions: placementPositions,
                reason: `Single symbol strategy: ${primarySymbol.count} → ${optimalTier.symbolCount} for ${actualMultiplier.toFixed(1)}x`
            }],
            targetAchieved,
            actualMultiplier,
            enhancementTime: Date.now() - startTime,
            analysis: {
                boardAnalysis,
                symbolPriority
            }
        };
    }

    /**
     * Apply multi-symbol enhancement strategy
     */
    private async applyMultiSymbolStrategy(
        request: EnhancementRequest,
        boardAnalysis: EnhancedBoardAnalysis,
        symbolPriority: SymbolPriorityResult,
        startTime: number,
        maxTime: number
    ): Promise<EnhancementResult> {
        const targetMultiplier = request.targetWin / request.totalBetAmount;
        const boardMultiplierSum = request.multipliers.reduce((sum, mult) => sum + mult, 0);

        // Analyze multi-symbol options
        const multiSymbolResult = this.multiSymbolStrategy.analyzeMultiSymbolOptions(
            symbolPriority.primarySymbol ? [symbolPriority.primarySymbol, ...symbolPriority.alternativeSymbols] : [],
            targetMultiplier,
            boardAnalysis.emptyPositions.length,
            boardMultiplierSum
        );

        // Check timeout
        if (Date.now() - startTime > maxTime) {
            return this.createTimeoutResult(request, boardAnalysis, symbolPriority, startTime);
        }

        // If multi-symbol isn't feasible, fall back to single symbol
        if (!multiSymbolResult.bestCombination || multiSymbolResult.fallbackToSingle) {
            return this.applySingleSymbolStrategy(request, boardAnalysis, symbolPriority, startTime, maxTime);
        }

        const combination = multiSymbolResult.bestCombination;
        const enhancedBoard = [...request.board];
        const symbolsPlaced: Array<{ symbol: number; positions: number[]; reason: string }> = [];

        // Place symbols for each symbol in the combination (only in truly empty positions)
        // Note: selectOptimalPositions uses boardAnalysis.emptyPositions which excludes symbol 10s
        for (const symbolInfo of combination.symbols) {
            const symbolsNeeded = Math.max(0, symbolInfo.targetCount - symbolInfo.currentCount);
            if (symbolsNeeded > 0) {
                const positions = this.selectOptimalPositions(
                    boardAnalysis,
                    symbolInfo.symbol,
                    symbolsNeeded
                );

                positions.forEach(pos => {
                    enhancedBoard[pos] = symbolInfo.symbol;
                });

                symbolsPlaced.push({
                    symbol: symbolInfo.symbol,
                    positions,
                    reason: `Multi-symbol: ${symbolInfo.currentCount} → ${symbolInfo.targetCount} (+${symbolsNeeded}) = ${symbolInfo.contribution.toFixed(1)}x`
                });
            }
        }

        const actualMultiplier = combination.totalMultiplier;
        const targetAchieved = actualMultiplier >= targetMultiplier * 0.8;

        return {
            enhancedBoard,
            // Multipliers array remains unchanged since we don't modify symbol 10 positions
            enhancedMultipliers: [...request.multipliers],
            strategy: 'multi-symbol',
            symbolsPlaced,
            targetAchieved,
            actualMultiplier,
            enhancementTime: Date.now() - startTime,
            analysis: {
                boardAnalysis,
                symbolPriority,
                multiSymbolResult
            }
        };
    }

    // /**
    //  * Apply multiplier boost strategy (minimal symbol changes, rely on board multipliers)
    //  */
    // private async applyMultiplierBoostStrategy(
    //     request: EnhancementRequest,
    //     boardAnalysis: EnhancedBoardAnalysis,
    //     symbolPriority: SymbolPriorityResult,
    //     startTime: number
    // ): Promise<EnhancementResult> {
    //     // For multiplier boost, we make minimal changes and rely on existing multipliers
    //     const boardMultiplierSum = request.multipliers.reduce((sum, mult) => sum + mult, 0);
        
    //     if (boardMultiplierSum === 0) {
    //         return this.createNoEnhancementResult(
    //             request, 
    //             boardAnalysis, 
    //             startTime, 
    //             'No board multipliers available for boost strategy'
    //         );
    //     }

    //     // Find the best near-win symbol and add minimal symbols
    //     const bestNearWin = symbolPriority.primarySymbol || symbolPriority.alternativeSymbols[0];
    //     if (!bestNearWin) {
    //         return this.createNoEnhancementResult(request, boardAnalysis, startTime, 'No near-win symbols for boost');
    //     }

    //     // Add just enough symbols to reach minimum win (8)
    //     const symbolsNeeded = Math.max(0, 8 - bestNearWin.count);
    //     const positions = this.selectOptimalPositions(boardAnalysis, bestNearWin.symbol, symbolsNeeded);

    //     const enhancedBoard = [...request.board];
    //     positions.forEach(pos => {
    //         enhancedBoard[pos] = bestNearWin.symbol;
    //     });

    //     // Calculate actual multiplier with board multipliers
    //     const baseMultiplier = bestNearWin.expectedPayout / 20; // Rough calculation
    //     const actualMultiplier = baseMultiplier * boardMultiplierSum;
    //     const targetMultiplier = request.targetWin / request.totalBetAmount;
    //     const targetAchieved = actualMultiplier >= targetMultiplier * 0.8;

    //     return {
    //         enhancedBoard,
    //         enhancedMultipliers: [...request.multipliers],
    //         strategy: 'multiplier-boost',
    //         symbolsPlaced: [{
    //             symbol: bestNearWin.symbol,
    //             positions,
    //             reason: `Multiplier boost: ${bestNearWin.count} → 8 with ${boardMultiplierSum}x board multiplier`
    //         }],
    //         targetAchieved,
    //         actualMultiplier,
    //         enhancementTime: Date.now() - startTime,
    //         analysis: {
    //             boardAnalysis,
    //             symbolPriority
    //         }
    //     };
    // }

    /**
     * Apply multiplier generation strategy (place Symbol 10s for high multiplier targets)
     */
    // private async applyMultiplierGenerationStrategy(
    //     request: EnhancementRequest,
    //     boardAnalysis: EnhancedBoardAnalysis,
    //     symbolPriority: SymbolPriorityResult,
    //     startTime: number
    // ): Promise<EnhancementResult> {
    //     const targetMultiplier = request.targetWin / request.totalBetAmount;
    //     const currentMultiplierSum = request.multipliers.reduce((sum, mult) => sum + mult, 0);
        
    //     const neededMultiplierSum = Math.ceil(targetMultiplier * 20);
    //     const additionalMultiplierNeeded = Math.max(0, neededMultiplierSum - currentMultiplierSum);
        
    //     if (additionalMultiplierNeeded <= 0) {
    //         return this.createNoEnhancementResult(
    //             request, 
    //             boardAnalysis, 
    //             startTime, 
    //             'Current multipliers sufficient for target'
    //         );
    //     }
        
    //     const symbol10sToPlace = Math.min(
    //         Math.ceil(additionalMultiplierNeeded / 15),
    //         boardAnalysis.emptyPositions.length
    //     );
        
    //     if (symbol10sToPlace === 0) {
    //         return this.createNoEnhancementResult(
    //             request, 
    //             boardAnalysis, 
    //             startTime, 
    //             'No empty positions for Symbol 10 placement'
    //         );
    //     }
        
    //     const positions = this.selectOptimalPositions(boardAnalysis, 10, symbol10sToPlace);
    //     const enhancedBoard = [...request.board];
        
    //     positions.forEach(pos => {
    //         enhancedBoard[pos] = 10;
    //     });
        
    //     const newMultiplierValues = Array(symbol10sToPlace).fill(0).map(() => 
    //         Math.floor(Math.random() * 24) + 2
    //     );
    //     const enhancedMultipliers = [...request.multipliers, ...newMultiplierValues];
    //     const newMultiplierSum = enhancedMultipliers.reduce((sum, mult) => sum + mult, 0);
        
    //     const actualMultiplier = (request.targetWin / request.totalBetAmount) * (newMultiplierSum / targetMultiplier);
    //     const targetAchieved = newMultiplierSum >= neededMultiplierSum * 0.8;
        
    //     return {
    //         enhancedBoard,
    //         enhancedMultipliers,
    //         strategy: 'multiplier-generation',
    //         symbolsPlaced: [{
    //             symbol: 10,
    //             positions,
    //             reason: `Generated ${symbol10sToPlace} Symbol 10s for ${newMultiplierSum}x total multiplier`
    //         }],
    //         targetAchieved,
    //         actualMultiplier,
    //         enhancementTime: Date.now() - startTime,
    //         analysis: {
    //             boardAnalysis,
    //             symbolPriority
    //         }
    //     };
    // }

    /**
     * Select optimal positions for symbol placement
     */
    private selectOptimalPositions(
        boardAnalysis: EnhancedBoardAnalysis,
        symbol: number,
        count: number
    ): number[] {
        // Use placement recommendations from board analysis
        const relevantRecommendations = boardAnalysis.placementRecommendations
            .filter(rec => rec.symbol === symbol)
            .sort((a, b) => b.priority - a.priority);

        const positions: number[] = [];
        
        // First, use high-priority recommendations
        for (const rec of relevantRecommendations) {
            if (positions.length >= count) break;
            if (boardAnalysis.emptyPositions.includes(rec.position)) {
                positions.push(rec.position);
            }
        }

        // If we need more positions, use remaining empty positions
        if (positions.length < count) {
            const remainingEmpty = boardAnalysis.emptyPositions.filter(pos => !positions.includes(pos));
            const needed = count - positions.length;
            
            // Prefer positions that spread across different reels
            const positionsByReel = this.groupPositionsByReel(remainingEmpty);
            const selectedPositions = this.selectSpreadPositions(positionsByReel, needed);
            
            positions.push(...selectedPositions);
        }

        return positions.slice(0, count);
    }

    /**
     * Group positions by reel for better distribution
     */
    private groupPositionsByReel(positions: number[]): { [reel: number]: number[] } {
        const grouped: { [reel: number]: number[] } = {};
        
        positions.forEach(pos => {
            const reel = Math.floor(pos / 5);
            if (!grouped[reel]) grouped[reel] = [];
            grouped[reel].push(pos);
        });
        
        return grouped;
    }

    /**
     * Select positions spread across reels for natural distribution
     */
    private selectSpreadPositions(positionsByReel: { [reel: number]: number[] }, needed: number): number[] {
        const selected: number[] = [];
        const reels = Object.keys(positionsByReel).map(r => parseInt(r));
        
        // Round-robin selection across reels
        let reelIndex = 0;
        while (selected.length < needed && reels.length > 0) {
            const currentReel = reels[reelIndex % reels.length];
            const reelPositions = positionsByReel[currentReel];
            
            if (reelPositions && reelPositions.length > 0) {
                selected.push(reelPositions.shift()!);
            }
            
            // Remove empty reels
            if (!reelPositions || reelPositions.length === 0) {
                reels.splice(reels.indexOf(currentReel), 1);
                if (reels.length === 0) break;
            } else {
                reelIndex++;
            }
        }
        
        return selected;
    }

    /**
     * Create no-enhancement result
     */
    private createNoEnhancementResult(
        request: EnhancementRequest,
        boardAnalysis: EnhancedBoardAnalysis,
        startTime: number,
        reason: string
    ): EnhancementResult {
        return {
            enhancedBoard: [...request.board],
            enhancedMultipliers: [...request.multipliers],
            strategy: 'no-enhancement',
            symbolsPlaced: [],
            targetAchieved: false,
            actualMultiplier: 0,
            enhancementTime: Date.now() - startTime,
            analysis: {
                boardAnalysis,
                symbolPriority: {
                    primarySymbol: null,
                    alternativeSymbols: [],
                    canReachTarget: false,
                    recommendedStrategy: 'multiplier-boost'
                }
            }
        };
    }

    /**
     * Create timeout result
     */
    private createTimeoutResult(
        request: EnhancementRequest,
        boardAnalysis: EnhancedBoardAnalysis,
        symbolPriority: SymbolPriorityResult,
        startTime: number
    ): EnhancementResult {
        return {
            enhancedBoard: [...request.board],
            enhancedMultipliers: [...request.multipliers],
            strategy: 'no-enhancement',
            symbolsPlaced: [],
            targetAchieved: false,
            actualMultiplier: 0,
            enhancementTime: Date.now() - startTime,
            analysis: {
                boardAnalysis,
                symbolPriority
            }
        };
    }

    /**
     * Get detailed enhancement analysis for debugging/logging
     */
    getDetailedAnalysis(result: EnhancementResult): string {
        let analysis = `Enhancement Strategy: ${result.strategy}\n`;
        analysis += `Target Achieved: ${result.targetAchieved} (${result.actualMultiplier.toFixed(1)}x)\n`;
        analysis += `Enhancement Time: ${result.enhancementTime}ms\n`;
        
        if (result.symbolsPlaced.length > 0) {
            analysis += `Symbols Placed:\n`;
            result.symbolsPlaced.forEach(placement => {
                analysis += `  ${placement.reason}\n`;
                analysis += `  Positions: [${placement.positions.join(', ')}]\n`;
            });
        }
        
        analysis += `\nBoard Analysis:\n`;
        analysis += `  Win Potential: ${result.analysis.boardAnalysis.winPotential}\n`;
        analysis += `  Board Density: ${result.analysis.boardAnalysis.boardDensity.toFixed(2)}\n`;
        analysis += `  Near-Win Symbols: ${result.analysis.boardAnalysis.nearWinSymbols.length}\n`;
        analysis += `  Cascade Score: ${result.analysis.boardAnalysis.cascadePotential.score.toFixed(2)}\n`;
        
        if (result.analysis.symbolPriority.primarySymbol) {
            analysis += `\n${this.symbolPrioritizer.getDetailedAnalysis(result.analysis.symbolPriority, result.actualMultiplier)}`;
        }
        
        if (result.analysis.multiSymbolResult) {
            analysis += `\n${this.multiSymbolStrategy.getDetailedAnalysis(result.analysis.multiSymbolResult, result.actualMultiplier)}`;
        }
        
        return analysis;
    }
}

