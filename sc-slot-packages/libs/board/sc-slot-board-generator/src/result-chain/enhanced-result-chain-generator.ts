import { clone, map, countBy, split } from "ramda";
import { BoardGenerator, IBoard, BoardSettings } from "../board-generator";
import { PayoutCalculator, PayoutResult } from "../payout-calculator";
import { RTPController, RTPConfiguration, RTPResult, BoardResult } from "./rtp-controller";
import { MultiplierConfig } from "../multiplier-generator";
import { Difficulty } from "../difficulties";
import { ResultChainGenerator, ResultChainConfig, ResultChain, CascadeSequence } from "./result-chain-generator";

export interface TumbleDetail {
    id: number;
    icons: Record<string, { count: number; odds: number }>;
    win: number;
    originalBoard: string;
    newBoard: string;
    multipliers: number[];
    explodedSymbols: number[];
    newSymbols: number[];
}

export interface SettlementResult {
    tumbles: TumbleDetail[];
    freeSpins: { count: number; odds: number };
    additionalFreeSpins: { count: number; odds: number };
}

export interface EnhancedCascadeSequence extends CascadeSequence {
    tumbles: TumbleDetail[];
    settlementResult: SettlementResult;
    symbolOccurrences: Record<number, number>;
}

export interface EnhancedBoardResult extends BoardResult {
    enhancedCascadeSequence?: EnhancedCascadeSequence;
    settlementResult?: SettlementResult;
    totalTumbleWin?: number;
}

export interface EnhancedResultChain extends ResultChain {
    boards: EnhancedBoardResult[];
    tumbleStats: {
        totalTumbles: number;
        averageTumblesPerRound: number;
        maxTumblesInRound: number;
        symbolDistribution: Record<number, number>;
    };
}

export class EnhancedResultChainGenerator extends ResultChainGenerator {
    constructor(boardSettings: BoardSettings, multiplierConfig: MultiplierConfig, difficulty: Difficulty = Difficulty.Medium) {
        super(boardSettings, multiplierConfig, difficulty);
    }

    /**
     * Generate enhanced result chain with detailed tumble tracking
     */
    async generateEnhancedChain(config: ResultChainConfig): Promise<EnhancedResultChain> {
        const baseChain = await this.generateChain(config);
        
        // Convert to enhanced chain
        const enhancedBoards: EnhancedBoardResult[] = [];
        let totalTumbles = 0;
        let maxTumblesInRound = 0;
        const symbolDistribution: Record<number, number> = {};

        for (const board of baseChain.boards) {
            const enhancedBoard = await this.enhanceBoardResult(board, config.betSize);
            enhancedBoards.push(enhancedBoard);

            if (enhancedBoard.enhancedCascadeSequence) {
                const tumbleCount = enhancedBoard.enhancedCascadeSequence.tumbles.length;
                totalTumbles += tumbleCount;
                maxTumblesInRound = Math.max(maxTumblesInRound, tumbleCount);

                // Track symbol occurrences
                for (const [symbol, count] of Object.entries(enhancedBoard.enhancedCascadeSequence.symbolOccurrences)) {
                    const symbolId = parseInt(symbol);
                    symbolDistribution[symbolId] = (symbolDistribution[symbolId] || 0) + count;
                }
            }
        }

        return {
            ...baseChain,
            boards: enhancedBoards,
            tumbleStats: {
                totalTumbles,
                averageTumblesPerRound: totalTumbles / enhancedBoards.length,
                maxTumblesInRound,
                symbolDistribution,
            },
        };
    }

    /**
     * Generate small test batch (10-20 rounds) for validation
     */
    async generateSmallTestBatch(rounds: number = 15): Promise<EnhancedResultChain> {
        const testConfig: ResultChainConfig = {
            boardCount: Math.min(Math.max(rounds, 10), 20), // Clamp between 10-20
            targetRTP: 0.97,
            betSize: 1,
            playerBudget: 100,
            difficulty: Difficulty.Easy, // Use easy difficulty for testing
            maxRetries: 3, // Fewer retries for quick testing
            tolerance: 0.1, // More lenient tolerance for small batches
        };

        return this.generateEnhancedChain(testConfig);
    }

    /**
     * Enhance existing board result with detailed tumble tracking
     */
    private async enhanceBoardResult(boardResult: BoardResult, betSize: number): Promise<EnhancedBoardResult> {
        // Simulate the cascade sequence that led to this board result
        const enhancedSequence = this.simulateFullCascadeWithDetails(
            { newBoard: boardResult.board, multipliers: boardResult.multipliers } as IBoard,
            betSize,
            boardResult.accumulatedMultiplier
        );

        const settlementResult = this.buildSettlementResult(enhancedSequence.tumbles);

        return {
            ...boardResult,
            enhancedCascadeSequence: enhancedSequence,
            settlementResult,
            totalTumbleWin: enhancedSequence.tumbles.reduce((sum, tumble) => sum + tumble.win, 0),
        };
    }

    /**
     * Simulate cascade with detailed tumble tracking
     */
    private simulateFullCascadeWithDetails(
        initialBoard: IBoard,
        betSize: number,
        accumulatedMultiplier: number = 0
    ): EnhancedCascadeSequence {
        let currentBoard = clone(initialBoard.newBoard);
        let currentMultipliers = clone(initialBoard.multipliers);
        let totalWin = 0;
        const cascades: CascadeSequence["cascades"] = [];
        const tumbles: TumbleDetail[] = [];
        const symbolOccurrences: Record<number, number> = {};
        const maxCascades = 10; // Prevent infinite loops
        let triggeredFreeSpin = false;
        let freeSpinsAwarded = 0;

        for (let cascadeLevel = 0; cascadeLevel < maxCascades; cascadeLevel++) {
            const payoutResult = this.getPayoutCalculator().calculatePayout(
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

            // Create tumble detail
            const originalBoardString = currentBoard.join(",");
            let newBoard = clone(currentBoard);
            let explodedSymbols: number[] = [];
            let newSymbols: number[] = [];

            // Only perform cascade if there are winning symbols
            if (payoutResult.winningSymbols.length > 0) {
                // Use existing board generator cascade logic
                const cascadeResult = this.getBoardGenerator().explodeAndRefill(
                    currentBoard,
                    payoutResult.winningSymbols,
                    currentMultipliers
                );

                newBoard = cascadeResult.newBoard;
                explodedSymbols = payoutResult.winningSymbols;
                newSymbols = this.findNewSymbols(currentBoard, newBoard, explodedSymbols);

                cascades.push({
                    board: clone(currentBoard),
                    winResult: payoutResult,
                    explodedSymbols,
                    newSymbols,
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
            }

            // Create detailed tumble record
            const tumbleDetail = this.createTumbleDetail(
                cascadeLevel,
                originalBoardString,
                newBoard.join(","),
                payoutResult,
                currentMultipliers,
                explodedSymbols,
                newSymbols
            );

            tumbles.push(tumbleDetail);

            // Track symbol occurrences from original board
            this.updateSymbolOccurrences(symbolOccurrences, currentBoard);

            if (payoutResult.winningSymbols.length === 0) {
                break; // End cascade if no more tumbles
            }
        }

        return {
            initialBoard: initialBoard.newBoard,
            cascades,
            finalBoard: currentBoard,
            totalWin,
            triggeredFreeSpin,
            freeSpinsAwarded,
            tumbles,
            settlementResult: this.buildSettlementResult(tumbles),
            symbolOccurrences,
        };
    }

    /**
     * Create detailed tumble record
     */
    private createTumbleDetail(
        id: number,
        originalBoard: string,
        newBoard: string,
        payoutResult: PayoutResult,
        multipliers: number[],
        explodedSymbols: number[],
        newSymbols: number[]
    ): TumbleDetail {
        // Convert symbol wins to icons format
        const icons: Record<string, { count: number; odds: number }> = {};
        
        payoutResult.symbolWins.forEach((win) => {
            const symbolId = win.symbol.toString();
            icons[symbolId] = {
                count: win.count,
                odds: win.baseWin, // Use base win as odds
            };
        });

        return {
            id,
            icons,
            win: payoutResult.totalWin,
            originalBoard,
            newBoard,
            multipliers: clone(multipliers),
            explodedSymbols: clone(explodedSymbols),
            newSymbols: clone(newSymbols),
        };
    }

    /**
     * Build settlement result from tumble details
     */
    private buildSettlementResult(tumbles: TumbleDetail[]): SettlementResult {
        // Count free spins from tumbles (simplified for now)
        let freeSpinsCount = 0;
        let freeSpinsOdds = 0;

        tumbles.forEach((tumble) => {
            // Check for scatter symbols (symbol 9 in default configuration)
            if (tumble.icons["9"]) {
                freeSpinsCount += tumble.icons["9"].count;
                if (tumble.icons["9"].count >= 4) {
                    freeSpinsOdds = tumble.icons["9"].count >= 6 ? 18 : (tumble.icons["9"].count >= 5 ? 6 : 3);
                }
            }
        });

        return {
            tumbles,
            freeSpins: { count: freeSpinsCount, odds: freeSpinsOdds },
            additionalFreeSpins: { count: 0, odds: 0 }, // Will be enhanced later for free spin rounds
        };
    }

    /**
     * Find newly added symbols after cascade
     */
    private findNewSymbols(originalBoard: number[], newBoard: number[], explodedPositions: number[]): number[] {
        const newSymbols: number[] = [];
        
        for (let i = 0; i < newBoard.length; i++) {
            if (explodedPositions.includes(i)) {
                newSymbols.push(newBoard[i]);
            }
        }
        
        return newSymbols;
    }

    /**
     * Update symbol occurrence tracking
     */
    private updateSymbolOccurrences(occurrences: Record<number, number>, board: number[]): void {
        const boardCounts = countBy((symbol) => symbol.toString(), board);
        
        Object.entries(boardCounts).forEach(([symbol, count]) => {
            const symbolId = parseInt(symbol);
            occurrences[symbolId] = (occurrences[symbolId] || 0) + count;
        });
    }

    /**
     * Get access to board generator (protected method access)
     */
    private getBoardGenerator(): BoardGenerator {
        return (this as any).boardGenerator;
    }

    /**
     * Get access to payout calculator (protected method access)
     */
    private getPayoutCalculator(): PayoutCalculator {
        return (this as any).payoutCalculator;
    }

    /**
     * Export enhanced chain results to JSON
     */
    exportEnhancedChainToJSON(chain: EnhancedResultChain): string {
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
                symbolWins: board.payoutResult.symbolWins,
                scatterWin: board.payoutResult.scatterWin,
                tumbles: board.settlementResult?.tumbles || [],
                settlementResult: board.settlementResult,
                totalTumbleWin: board.totalTumbleWin,
            })),
        };

        return JSON.stringify(exportData, null, 2);
    }
}
