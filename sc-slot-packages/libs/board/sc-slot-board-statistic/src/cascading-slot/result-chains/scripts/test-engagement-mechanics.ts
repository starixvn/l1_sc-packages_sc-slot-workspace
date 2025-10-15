#!/usr/bin/env ts-node

/**
 * Engagement Mechanics Test Script
 * Tests each pattern with 30-board chains to validate engagement metrics
 */

import { ResultChainOrchestrator } from '../orchestration/result-chain-orchestrator';
import { createPatternSpecificBoardGeneratorFactory } from '../orchestration/custom-generator-configs';
import { Volatility } from 'sc-slot-board-generator/lib/volatility';
import { commonDefinition } from '../../generator-definition';
import { BoardResult } from '../orchestration/rtp-controller';

interface EngagementMetrics {
    actualRTP: number;
    hitFrequency: number;
    avgCascades: number;
    scatterFrequency: number;
    premiumSymbolPercent: number;
    freeSpinTriggerRate: number;
}

/**
 * Calculate engagement metrics from a result chain
 */
function calculateEngagementMetrics(boards: BoardResult[]): EngagementMetrics {
    let totalWins = 0;
    let totalBets = 0;
    let winningBoards = 0;
    let totalCascades = 0;
    let totalScatters = 0;
    let totalPremiumSymbols = 0;
    let totalSymbols = 0;
    let freeSpinTriggers = 0;

    boards.forEach(board => {
        // Calculate RTP
        const betAmount = board.betAmount || 1;
        totalBets += betAmount;
        const win = board.totalWin || board.totalTumbleWin || 0;
        totalWins += win;
        if (win > 0) winningBoards++;

        // Count cascades
        if (board.settlementResult?.tumbles) {
            totalCascades += board.settlementResult.tumbles.length;
        }

        // Count scatter symbols (symbol 9)
        board.board.forEach(symbol => {
            if (symbol === 9) totalScatters++;
            if (symbol === 7 || symbol === 8) totalPremiumSymbols++;
            if (symbol >= 0 && symbol <= 10) totalSymbols++;
        });

        // Count free spin triggers (4+ scatters)
        const scatterCount = board.board.filter(s => s === 9).length;
        if (scatterCount >= 4) freeSpinTriggers++;
    });

    return {
        actualRTP: totalBets > 0 ? totalWins / totalBets : 0,
        hitFrequency: boards.length > 0 ? winningBoards / boards.length : 0,
        avgCascades: boards.length > 0 ? totalCascades / boards.length : 0,
        scatterFrequency: totalSymbols > 0 ? totalScatters / totalSymbols : 0,
        premiumSymbolPercent: totalSymbols > 0 ? totalPremiumSymbols / totalSymbols : 0,
        freeSpinTriggerRate: boards.length > 0 ? freeSpinTriggers / boards.length : 0,
    };
}

/**
 * Test a single pattern with 30-board chain
 */
async function testPattern(patternType: string): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing Pattern: ${patternType.toUpperCase()}`);
    console.log('='.repeat(60));

    const { generatorFactory, engagementMechanics } = 
        createPatternSpecificBoardGeneratorFactory(patternType);
    
    const targetRTP = engagementMechanics?.targetRTP || 0.97;
    const tolerance = engagementMechanics?.rtpTolerance || 0.01;
    const boardCount = 30;

    // Calculate bet amounts
    const coinValue = 0.1;
    const betLevel = 0.5;
    const betMultiplier = commonDefinition.betSettings.defaultBetMultiplier;
    const totalBetAmount = coinValue * betLevel * betMultiplier;

    const orchestrator = new ResultChainOrchestrator(
        generatorFactory,
        {
            targetRTP,
            tolerance,
            boardCount,
            betSize: totalBetAmount,
            playerBudget: boardCount * totalBetAmount,
        },
        engagementMechanics
    );
    
    console.log(`\n📊 Generating ${boardCount}-board test chain...`);
    const startTime = Date.now();
    
    const chain = await orchestrator.generateResultChain({
        boardCount,
        targetRTP,
        volatility: Volatility.MediumLow,
        maxRetries: 5,
        tolerance,
        betLevel,
        coinValue,
    });
    
    const duration = Date.now() - startTime;
    
    // Calculate metrics
    const metrics = calculateEngagementMetrics(chain.boards);
    
    console.log(`\n✅ Generation completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`\n📈 Engagement Metrics:`);
    console.log(`   RTP: ${(metrics.actualRTP * 100).toFixed(2)}% (target: ${(targetRTP * 100).toFixed(1)}%)`);
    console.log(`   RTP Variance: ${Math.abs(metrics.actualRTP - targetRTP) <= tolerance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Hit Frequency: ${(metrics.hitFrequency * 100).toFixed(1)}%`);
    console.log(`   Avg Cascades: ${metrics.avgCascades.toFixed(2)}`);
    console.log(`   Free Spin Trigger Rate: ${(metrics.freeSpinTriggerRate * 100).toFixed(1)}%`);
    
    if (engagementMechanics?.targetHitFrequency) {
        const hitDiff = Math.abs(metrics.hitFrequency - engagementMechanics.targetHitFrequency);
        console.log(`   Hit Frequency Target: ${(engagementMechanics.targetHitFrequency * 100).toFixed(0)}% (diff: ${(hitDiff * 100).toFixed(1)}%)`);
    }
    
    if (engagementMechanics?.cascadeTarget) {
        const cascadeDiff = Math.abs(metrics.avgCascades - engagementMechanics.cascadeTarget);
        console.log(`   Cascade Target: ${engagementMechanics.cascadeTarget} (diff: ${cascadeDiff.toFixed(2)})`);
    }
    
    if (engagementMechanics?.scatterBoost) {
        console.log(`   Scatter Frequency: ${(metrics.scatterFrequency * 100).toFixed(2)}%`);
    }
    
    if (engagementMechanics?.premiumSymbolBoost) {
        console.log(`   Premium Symbol %: ${(metrics.premiumSymbolPercent * 100).toFixed(2)}%`);
    }
}

/**
 * Main test runner
 */
async function main() {
    console.log('🧪 Engagement Mechanics Validation Test');
    console.log('Testing 3 pilot patterns with custom RTP targets\n');
    
    try {
        await testPattern('comeback');
        await testPattern('cliffhanger');
        await testPattern('discovery');
        
        console.log(`\n${'='.repeat(60)}`);
        console.log('✅ All pattern tests completed');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { testPattern, calculateEngagementMetrics };

