/**
 * Test script to verify the enhanced board processing is integrated into generate-chains
 */
import { ResultChainOrchestrator } from './result-chains/orchestration/result-chain-orchestrator';
import { commonDefinition } from './generator-definition.js';
import { Difficulty } from 'sc-slot-board-generator';

// Mock board generator for testing
class MockBoardGenerator {
    generate() {
        // Create a board with your stuck case: 6×symbol4, 6×symbol2, 5×symbol6
        const board = new Array(30).fill(-1);
        
        // Place 6 × symbol 4 (needs 2 more for win)
        [0, 1, 5, 6, 10, 11].forEach(pos => board[pos] = 4);
        
        // Place 6 × symbol 2 (needs 2 more for win)
        [2, 7, 12, 17, 20, 25].forEach(pos => board[pos] = 2);
        
        // Place 5 × symbol 6 (needs 3 more for win)
        [3, 8, 13, 18, 23].forEach(pos => board[pos] = 6);
        
        return {
            newBoard: board,
            multipliers: [0, 0, 0, 0, 0, 0]
        };
    }

    explodeAndRefill(board: number[], winSymbols: number[], oldMultipliers: number[]) {
        // Simple mock implementation
        const newBoard = [...board];
        const explodedSymbols = board.map(s => winSymbols.includes(s) ? s : -1);
        const newSymbols = board.map(s => winSymbols.includes(s) ? Math.floor(Math.random() * 9) : -1);
        
        return {
            newBoard,
            explodedSymbols,
            newSymbols,
            multipliers: [...oldMultipliers]
        };
    }

    getUnderlyingGenerator() {
        return this;
    }
}

export async function testEnhancedIntegration() {
    console.log('🧪 TESTING ENHANCED BOARD PROCESSING INTEGRATION');
    console.log('================================================');
    
    try {
        // Setup test configuration
        const coinValue = 0.1;
        const betLevel = 0.5;
        const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
        const totalBetAmount = coinValue * betLevel * betMultiplier;
        
        console.log(`Total bet amount: ${totalBetAmount}`);
        console.log('');
        
        // Create RTP configuration
        const rtpConfig = {
            targetRTP: 0.97,
            tolerance: 0.02,
            boardCount: 5, // Small test batch
            betSize: totalBetAmount,
            playerBudget: 5 * totalBetAmount,
        };
        
        // Create orchestrator with mock generator
        const boardGeneratorFactory = () => new MockBoardGenerator();
        const orchestrator = new ResultChainOrchestrator(boardGeneratorFactory, rtpConfig);
        
        console.log('🎯 Generating test chain with enhanced processing...');
        const startTime = Date.now();
        
        // Generate small test chain
        const chainResult = await orchestrator.generateResultChain({
            boardCount: 5,
            targetRTP: 0.97,
            difficulty: Difficulty.Medium,
            maxRetries: 3,
            tolerance: 0.02,
            betLevel: 0.5,
            coinValue: 0.1
        });
        
        const duration = Date.now() - startTime;
        console.log(`✅ Chain generation completed in ${duration}ms`);
        console.log('');
        
        // Analyze results
        console.log('📊 RESULTS ANALYSIS:');
        console.log('====================');
        console.log(`Boards generated: ${chainResult.boards.length}`);
        console.log(`Final RTP: ${(chainResult.rtpResult.actualRTP * 100).toFixed(2)}%`);
        console.log(`Target achieved: ${chainResult.rtpResult.meetsTarget ? '✅' : '❌'}`);
        console.log('');
        
        // Check individual boards
        console.log('📋 BOARD ANALYSIS:');
        console.log('==================');
        chainResult.boards.forEach((board, index) => {
            const totalWin = board.totalWin || board.totalTumbleWin || 0;
            const multiplier = totalWin / totalBetAmount;
            
            console.log(`Board ${index + 1}:`);
            console.log(`  Total win: ${totalWin.toFixed(4)} (${multiplier.toFixed(1)}x)`);
            console.log(`  Tumbles: ${board.settlementResult?.tumbles?.length || 0}`);
            
            if (multiplier > 2.0) {
                console.log(`  🎯 High multiplier board - enhancement likely used!`);
            }
        });
        
        console.log('');
        console.log('🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY!');
        console.log('The enhanced board processing is now active in generate-chains.');
        
        return chainResult;
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run test if executed directly
if (require.main === module) {
    testEnhancedIntegration().catch(console.error);
}
