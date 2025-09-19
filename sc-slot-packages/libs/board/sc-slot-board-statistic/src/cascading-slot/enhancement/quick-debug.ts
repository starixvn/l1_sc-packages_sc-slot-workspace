import { debugStuckEnhancement, createStuckTestCase } from './debug-enhancement.js';

/**
 * Quick debug script to test the stuck enhancement case
 * Run this to identify where the enhancement is getting stuck
 */
async function quickDebug() {
    console.log('🚀 QUICK DEBUG - STUCK ENHANCEMENT');
    console.log('===================================');
    
    try {
        // Create the test case based on your error message
        const testCase = createStuckTestCase();
        
        // Run the debug analysis
        const result = await debugStuckEnhancement(
            testCase.board,
            testCase.multipliers,
            testCase.targetWin,
            testCase.totalBetAmount
        );
        
        console.log('');
        console.log('🎯 DEBUG COMPLETED');
        console.log('==================');
        console.log(`Result: ${result.targetAchieved ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Strategy: ${result.strategy}`);
        console.log(`Time: ${result.enhancementTime}ms`);
        
        if (result.error) {
            console.log(`Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Alternative: Test with your actual stuck case
export async function debugYourStuckCase(
    board: number[],
    multipliers: number[],
    targetWin: number,
    totalBetAmount: number
) {
    console.log('🔍 DEBUGGING YOUR SPECIFIC STUCK CASE');
    console.log('====================================');
    
    try {
        const result = await debugStuckEnhancement(board, multipliers, targetWin, totalBetAmount);
        
        console.log('');
        console.log('💡 SOLUTION SUGGESTIONS:');
        console.log('========================');
        
        if (result.error && result.error.includes('timeout')) {
            console.log('1. ⏱️ TIMEOUT ISSUE:');
            console.log('   • The enhancement is taking too long');
            console.log('   • Increase maxEnhancementTime parameter');
            console.log('   • Check for infinite loops in prioritization');
            console.log('');
        }
        
        if (result.strategy === 'no-enhancement') {
            console.log('2. 🚫 NO ENHANCEMENT STRATEGY:');
            console.log('   • No suitable near-win symbols found');
            console.log('   • Try lowering near-win threshold (4-7 → 3-7)');
            console.log('   • Check if defaultOdds is loading correctly');
            console.log('');
        }
        
        if (!result.targetAchieved && result.actualMultiplier === 0) {
            console.log('3. ⚡ ZERO MULTIPLIER:');
            console.log('   • Symbol odds calculation failed');
            console.log('   • Check defaultOdds import');
            console.log('   • Verify symbol configuration');
            console.log('');
        }
        
        console.log('4. 🛠️ IMMEDIATE FIXES TO TRY:');
        console.log('   • Use fallback odds if defaultOdds fails');
        console.log('   • Add more timeout protection');
        console.log('   • Implement early exit conditions');
        console.log('   • Add detailed logging to find bottleneck');
        
        return result;
        
    } catch (error) {
        console.error('❌ Debug of your case failed:', error.message);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    quickDebug().catch(console.error);
}
