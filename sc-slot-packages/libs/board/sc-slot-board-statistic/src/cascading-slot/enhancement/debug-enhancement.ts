import { BoardEnhancementOrchestrator } from './board-enhancement-orchestrator.js';

/**
 * Debug utility for enhancement issues
 * Helps identify where the enhancement process is getting stuck
 */
export class EnhancementDebugger {
    private orchestrator: BoardEnhancementOrchestrator;

    constructor() {
        this.orchestrator = new BoardEnhancementOrchestrator();
    }

    /**
     * Debug the specific case that's getting stuck
     */
    async debugStuckCase(
        board: number[],
        multipliers: number[],
        targetWin: number,
        totalBetAmount: number
    ) {
        console.log('🔍 DEBUGGING STUCK ENHANCEMENT CASE');
        console.log('=====================================');
        
        const targetMultiplier = targetWin / totalBetAmount;
        console.log(`Target Win: ${targetWin}`);
        console.log(`Total Bet: ${totalBetAmount}`);
        console.log(`Target Multiplier: ${targetMultiplier.toFixed(2)}x`);
        console.log('');

        // Step 1: Analyze board state
        console.log('📋 STEP 1: Board Analysis');
        console.log('-'.repeat(30));
        this.analyzeBoard(board);
        console.log('');

        // Step 2: Test symbol prioritization
        console.log('🎯 STEP 2: Symbol Prioritization');
        console.log('-'.repeat(30));
        await this.testSymbolPrioritization(board, targetMultiplier, multipliers);
        console.log('');

        // Step 3: Test enhancement with timeout
        console.log('⚡ STEP 3: Enhancement Process');
        console.log('-'.repeat(30));
        const result = await this.testEnhancementWithTimeout(board, multipliers, targetWin, totalBetAmount);
        console.log('');

        // Step 4: Analyze results
        console.log('📊 STEP 4: Results Analysis');
        console.log('-'.repeat(30));
        this.analyzeResults(result);

        return result;
    }

    /**
     * Analyze the current board state
     */
    private analyzeBoard(board: number[]) {
        const symbolCounts: { [symbol: number]: number } = {};
        let emptyCount = 0;

        // Count symbols
        board.forEach(symbol => {
            if (symbol >= 0 && symbol <= 10) {
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            } else {
                emptyCount++;
            }
        });

        console.log(`Board size: ${board.length} positions`);
        console.log(`Empty positions: ${emptyCount}`);
        console.log('Symbol counts:');
        
        Object.entries(symbolCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([symbol, count]) => {
                const status = count >= 8 ? '✅ WINNING' : 
                             count >= 5 ? '🟡 NEAR-WIN' : 
                             count >= 3 ? '🔵 POTENTIAL' : '⚪ LOW';
                console.log(`  Symbol ${symbol}: ${count} ${status}`);
            });

        // Identify specific issues
        const winningSymbols = Object.entries(symbolCounts).filter(([,count]) => count >= 8);
        const nearWinSymbols = Object.entries(symbolCounts).filter(([,count]) => count >= 4 && count <= 7);

        if (winningSymbols.length > 0) {
            console.log('⚠️  Board already has winning symbols - should not need enhancement!');
        }

        if (nearWinSymbols.length === 0) {
            console.log('⚠️  No near-win symbols found - enhancement will be difficult!');
        }

        if (emptyCount === 0) {
            console.log('⚠️  No empty positions - cannot place new symbols!');
        }
    }

    /**
     * Test symbol prioritization logic
     */
    private async testSymbolPrioritization(board: number[], targetMultiplier: number, multipliers: number[]) {
        try {
            const symbolCounts: { [symbol: number]: number } = {};
            board.forEach(symbol => {
                if (symbol >= 0 && symbol <= 10) {
                    symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
                }
            });

            const boardMultiplierSum = multipliers.reduce((sum, mult) => sum + mult, 0);
            
            console.log(`Board multiplier sum: ${boardMultiplierSum}`);
            console.log('Testing symbol prioritization...');

            // Create a simple prioritizer for testing
            const nearWinSymbols = Object.entries(symbolCounts)
                .filter(([symbol, count]) => {
                    const sym = parseInt(symbol);
                    return count >= 4 && count <= 7 && sym >= 0 && sym <= 8;
                })
                .map(([symbol, count]) => {
                    const sym = parseInt(symbol);
                    return {
                        symbol: sym,
                        count,
                        needed: 8 - count,
                        // Simple priority calculation for debugging
                        priority: (count / 7) * 0.7 + (sym / 8) * 0.3,
                        expectedPayout: this.getSimpleOdds(sym) || 0
                    };
                });

            console.log(`Found ${nearWinSymbols.length} near-win symbols:`);
            nearWinSymbols.forEach(nw => {
                console.log(`  Symbol ${nw.symbol}: ${nw.count} → needs ${nw.needed} (priority: ${nw.priority.toFixed(2)})`);
            });

            if (nearWinSymbols.length === 0) {
                console.log('❌ No near-win symbols found - this explains why enhancement is stuck!');
                console.log('💡 Suggestion: Lower the near-win threshold or check board generation');
            }

        } catch (error) {
            console.log(`❌ Error in symbol prioritization: ${error.message}`);
            console.log('💡 This might be where the enhancement is getting stuck!');
        }
    }

    /**
     * Test enhancement with proper timeout and error handling
     */
    private async testEnhancementWithTimeout(
        board: number[],
        multipliers: number[],
        targetWin: number,
        totalBetAmount: number
    ) {
        const enhancementRequest = {
            board: [...board], // Copy to avoid mutations
            multipliers: [...multipliers],
            targetWin,
            totalBetAmount,
            maxEnhancementTime: 5000 // 5 second timeout for debugging
        };

        console.log('Starting enhancement with 5-second timeout...');
        const startTime = Date.now();

        try {
            const result = await Promise.race([
                this.orchestrator.enhanceBoard(enhancementRequest),
                this.createTimeoutPromise(5000)
            ]);

            const duration = Date.now() - startTime;
            console.log(`✅ Enhancement completed in ${duration}ms`);
            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ Enhancement failed after ${duration}ms: ${error.message}`);
            
            // Return a safe fallback result
            return {
                enhancedBoard: [...board],
                enhancedMultipliers: [...multipliers],
                strategy: 'no-enhancement' as const,
                symbolsPlaced: [],
                targetAchieved: false,
                actualMultiplier: 0,
                enhancementTime: duration,
                analysis: {
                    boardAnalysis: null,
                    symbolPriority: {
                        primarySymbol: null,
                        alternativeSymbols: [],
                        canReachTarget: false,
                        recommendedStrategy: 'multiplier-boost' as const
                    }
                },
                error: error.message
            };
        }
    }

    /**
     * Create a timeout promise for testing
     */
    private createTimeoutPromise(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Enhancement timed out after ${ms}ms`));
            }, ms);
        });
    }

    /**
     * Analyze enhancement results
     */
    private analyzeResults(result: any) {
        console.log(`Strategy used: ${result.strategy}`);
        console.log(`Target achieved: ${result.targetAchieved ? '✅' : '❌'}`);
        console.log(`Actual multiplier: ${result.actualMultiplier.toFixed(2)}x`);
        console.log(`Enhancement time: ${result.enhancementTime}ms`);

        if (result.error) {
            console.log(`❌ Error occurred: ${result.error}`);
        }

        if (result.symbolsPlaced && result.symbolsPlaced.length > 0) {
            console.log('Symbols placed:');
            result.symbolsPlaced.forEach((placement: any) => {
                console.log(`  ${placement.reason}`);
            });
        } else {
            console.log('⚠️  No symbols were placed');
        }

        // Provide recommendations
        this.provideRecommendations(result);
    }

    /**
     * Provide recommendations based on results
     */
    private provideRecommendations(result: any) {
        console.log('');
        console.log('💡 RECOMMENDATIONS:');
        console.log('-'.repeat(20));

        if (result.error && result.error.includes('timeout')) {
            console.log('• Increase maxEnhancementTime parameter');
            console.log('• Optimize enhancement algorithms');
            console.log('• Add more early exit conditions');
        }

        if (result.strategy === 'no-enhancement') {
            console.log('• Check if board already has winning symbols');
            console.log('• Lower near-win detection threshold');
            console.log('• Verify target multiplier is achievable');
        }

        if (!result.targetAchieved && result.actualMultiplier > 0) {
            console.log('• Consider using board multipliers');
            console.log('• Try multi-symbol strategy');
            console.log('• Adjust target multiplier expectations');
        }

        if (result.symbolsPlaced && result.symbolsPlaced.length === 0) {
            console.log('• Check for available empty positions');
            console.log('• Verify symbol placement logic');
            console.log('• Consider alternative enhancement strategies');
        }
    }

    /**
     * Simple odds calculation for debugging
     */
    private getSimpleOdds(symbol: number): number {
        // Simplified odds based on symbol value
        const baseOdds = [5, 8, 10, 16, 20, 30, 40, 50, 200];
        return baseOdds[symbol] || 5;
    }
}

/**
 * Quick debug function for the specific stuck case
 */
export async function debugStuckEnhancement(
    board: number[],
    multipliers: number[],
    targetWin: number,
    totalBetAmount: number
) {
    const debugger = new EnhancementDebugger();
    return await debugger.debugStuckCase(board, multipliers, targetWin, totalBetAmount);
}

/**
 * Create a test case that reproduces the stuck scenario
 */
export function createStuckTestCase() {
    console.log('🧪 Creating test case for stuck enhancement...');
    
    // Based on the error message: "Enhancing board for target win: 0.72 (3.6x total bet)"
    const targetWin = 0.72;
    const totalBetAmount = 0.2; // This gives us 3.6x multiplier
    
    // Create a board with the near-win symbols mentioned: 4(6), 2(6), 6(5)
    const board = new Array(30).fill(-1);
    
    // Place 6 × symbol 4
    [0, 1, 5, 6, 10, 11].forEach(pos => board[pos] = 4);
    
    // Place 6 × symbol 2  
    [2, 7, 12, 17, 20, 25].forEach(pos => board[pos] = 2);
    
    // Place 5 × symbol 6
    [3, 8, 13, 18, 23].forEach(pos => board[pos] = 6);
    
    const multipliers = [0, 0, 0, 0, 0, 0]; // No board multipliers
    
    console.log('Test case created:');
    console.log(`Target win: ${targetWin} (${(targetWin/totalBetAmount).toFixed(1)}x)`);
    console.log(`Symbol counts: 4(6), 2(6), 6(5)`);
    console.log('');
    
    return { board, multipliers, targetWin, totalBetAmount };
}
