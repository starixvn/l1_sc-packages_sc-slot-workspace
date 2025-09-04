/**
 * Emotional Patterns Testing Script
 * 
 * This script generates board chains using the 5 core emotional patterns,
 * saves detailed results for verification, and calculates RTP for each pattern.
 * 
 * Features:
 * - Tests all 5 emotional engagement patterns
 * - Generates configurable chain lengths
 * - Saves detailed results to JSON files
 * - Calculates comprehensive RTP metrics
 * - Validates pattern effectiveness
 * - Real settlement calculator integration
 */

import { ResultChainOrchestrator } from './cascading-slot/result-chain-orchestrator.js';
import { BoardGeneratorAdapter } from './cascading-slot/board-generator-adapter.js';
import { PatternStateMachineRTPController } from './cascading-slot/pattern-state-machine-rtp-controller.js';
import { ENGAGEMENT_PATTERNS } from './cascading-slot/engagement-patterns.js';
import { PLAYER_TYPE_CONFIGS } from './cascading-slot/configs/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test Configuration
const TEST_CONFIG = {
    chainLength: 100,           // Rounds per pattern test
    betSize: 1.0,              // Standard bet size
    targetRTP: 0.85,           // Expected RTP target
    saveDetailedResults: true,  // Save full chain data
    outputDir: './pattern-test-results'
};

interface PatternTestResult {
    patternName: string;
    chainLength: number;
    totalWagered: number;
    totalWon: number;
    actualRTP: number;
    targetRTP: number;
    rtpVariance: number;
    chainData: any[];
    featureStats: {
        freeSpinsTriggered: number;
        additionalFreeSpinsTriggered: number;
        tumbleCascadesTriggered: number;
        totalFeaturesTriggered: number;
    };
    patternStats: {
        patternsCompleted: number;
        averagePatternLength: number;
        patternSuccessRate: number;
    };
    winDistribution: {
        bigWins: number;      // > 5x bet
        mediumWins: number;   // 1x-5x bet  
        smallWins: number;    // 0.1x-1x bet
        losses: number;       // 0x bet
    };
    emotionalProfile: {
        tensionPeaks: number;
        reliefMoments: number;
        excitementSpikes: number;
        engagementScore: number;
    };
    timestamp: string;
    executionTimeMs: number;
}

interface TestSummary {
    testConfig: typeof TEST_CONFIG;
    patterns: PatternTestResult[];
    overallStats: {
        averageRTP: number;
        rtpStandardDeviation: number;
        bestPerformingPattern: string;
        worstPerformingPattern: string;
        mostEngagingPattern: string;
    };
    recommendations: string[];
    timestamp: string;
    totalExecutionTimeMs: number;
}

class EmotionalPatternTester {
    private orchestrator: ResultChainOrchestrator;
    private results: PatternTestResult[] = [];

    constructor() {
        // Initialize orchestrator with balanced configuration
        const balancedConfig = PLAYER_TYPE_CONFIGS['balanced'];
        const controller = new PatternStateMachineRTPController(balancedConfig);
        const boardGenerator = new BoardGeneratorAdapter();
        
        this.orchestrator = new ResultChainOrchestrator(controller, boardGenerator);
    }

    async testAllPatterns(): Promise<TestSummary> {
        console.log('🎭 Starting Emotional Pattern Testing...\n');
        console.log(`Configuration:`);
        console.log(`- Chain Length: ${TEST_CONFIG.chainLength} rounds`);
        console.log(`- Bet Size: $${TEST_CONFIG.betSize}`);
        console.log(`- Target RTP: ${(TEST_CONFIG.targetRTP * 100).toFixed(1)}%`);
        console.log(`- Output Directory: ${TEST_CONFIG.outputDir}\n`);

        const startTime = Date.now();
        
        // Create output directory
        mkdirSync(TEST_CONFIG.outputDir, { recursive: true });

        // Test each emotional pattern
        for (const [patternName, patternConfig] of Object.entries(ENGAGEMENT_PATTERNS)) {
            console.log(`🎯 Testing Pattern: ${patternName.toUpperCase()}`);
            
            const result = await this.testPattern(patternName, patternConfig);
            this.results.push(result);
            
            // Save individual pattern result
            if (TEST_CONFIG.saveDetailedResults) {
                this.savePatternResult(result);
            }
            
            // Display quick stats
            console.log(`   ✅ RTP: ${(result.actualRTP * 100).toFixed(2)}% (Target: ${(result.targetRTP * 100).toFixed(1)}%)`);
            console.log(`   🎰 Features Triggered: ${result.featureStats.totalFeaturesTriggered}`);
            console.log(`   📊 Engagement Score: ${result.emotionalProfile.engagementScore.toFixed(2)}`);
            console.log(`   ⏱️  Execution Time: ${result.executionTimeMs}ms\n`);
        }

        const totalTime = Date.now() - startTime;
        
        // Generate comprehensive summary
        const summary = this.generateSummary(totalTime);
        this.saveSummary(summary);
        
        console.log('🎉 Pattern testing completed!');
        console.log(`📁 Results saved to: ${TEST_CONFIG.outputDir}`);
        
        return summary;
    }

    private async testPattern(patternName: string, patternConfig: any): Promise<PatternTestResult> {
        const startTime = Date.now();
        
        // Configure orchestrator for this specific pattern
        const patternController = new PatternStateMachineRTPController({
            ...PLAYER_TYPE_CONFIGS['balanced'],
            activePatterns: [patternName],
            patternPriorities: { [patternName]: 1.0 }
        });
        
        const boardGenerator = new BoardGeneratorAdapter();
        const orchestrator = new ResultChainOrchestrator(patternController, boardGenerator);
        
        // Generate result chain using this pattern
        const chainResult = await orchestrator.generateResultChain({
            chainLength: TEST_CONFIG.chainLength,
            betSize: TEST_CONFIG.betSize,
            targetRTP: TEST_CONFIG.targetRTP,
            maxRetries: 3
        });

        const executionTime = Date.now() - startTime;
        
        // Calculate comprehensive metrics
        const metrics = this.calculateMetrics(chainResult, patternName, executionTime);
        
        return metrics;
    }

    private calculateMetrics(chainResult: any, patternName: string, executionTimeMs: number): PatternTestResult {
        const totalWagered = chainResult.results.length * TEST_CONFIG.betSize;
        let totalWon = 0;
        let bigWins = 0, mediumWins = 0, smallWins = 0, losses = 0;
        let freeSpinsTriggered = 0, additionalFreeSpinsTriggered = 0, tumbleCascadesTriggered = 0;
        let tensionPeaks = 0, reliefMoments = 0, excitementSpikes = 0;

        // Analyze each result in the chain
        chainResult.results.forEach((result: any, index: number) => {
            const winAmount = result.totalWin || 0;
            totalWon += winAmount;
            
            // Categorize win sizes
            const winRatio = winAmount / TEST_CONFIG.betSize;
            if (winRatio === 0) losses++;
            else if (winRatio < 1) smallWins++;
            else if (winRatio <= 5) mediumWins++;
            else bigWins++;

            // Count feature triggers
            if (result.features?.freeSpins) freeSpinsTriggered++;
            if (result.features?.additionalFreeSpins) additionalFreeSpinsTriggered++;
            if (result.features?.tumbleCascade) tumbleCascadesTriggered++;

            // Analyze emotional patterns (simplified heuristics)
            if (index > 0) {
                const prevWin = chainResult.results[index - 1].totalWin || 0;
                const currentWin = winAmount;
                
                // Tension peaks: loss after win
                if (prevWin > 0 && currentWin === 0) tensionPeaks++;
                
                // Relief moments: win after loss streak
                if (prevWin === 0 && currentWin > 0) reliefMoments++;
                
                // Excitement spikes: big win after small/no wins
                if (currentWin > TEST_CONFIG.betSize * 3) excitementSpikes++;
            }
        });

        const actualRTP = totalWon / totalWagered;
        const rtpVariance = Math.abs(actualRTP - TEST_CONFIG.targetRTP);
        
        // Calculate engagement score based on emotional dynamics
        const engagementScore = this.calculateEngagementScore({
            tensionPeaks,
            reliefMoments, 
            excitementSpikes,
            winDistribution: { bigWins, mediumWins, smallWins, losses },
            featureFrequency: (freeSpinsTriggered + additionalFreeSpinsTriggered + tumbleCascadesTriggered) / chainResult.results.length
        });

        return {
            patternName,
            chainLength: chainResult.results.length,
            totalWagered,
            totalWon,
            actualRTP,
            targetRTP: TEST_CONFIG.targetRTP,
            rtpVariance,
            chainData: chainResult.results,
            featureStats: {
                freeSpinsTriggered,
                additionalFreeSpinsTriggered,
                tumbleCascadesTriggered,
                totalFeaturesTriggered: freeSpinsTriggered + additionalFreeSpinsTriggered + tumbleCascadesTriggered
            },
            patternStats: {
                patternsCompleted: Math.floor(chainResult.results.length / 10), // Estimate
                averagePatternLength: 10, // Simplified
                patternSuccessRate: Math.min(1.0, 1.0 - rtpVariance * 5) // Higher variance = lower success
            },
            winDistribution: { bigWins, mediumWins, smallWins, losses },
            emotionalProfile: {
                tensionPeaks,
                reliefMoments,
                excitementSpikes,
                engagementScore
            },
            timestamp: new Date().toISOString(),
            executionTimeMs
        };
    }

    private calculateEngagementScore(data: any): number {
        // Simplified engagement scoring algorithm
        const {
            tensionPeaks,
            reliefMoments,
            excitementSpikes,
            winDistribution,
            featureFrequency
        } = data;
        
        let score = 0;
        
        // Reward emotional variety (tension/relief cycles)
        score += Math.min(tensionPeaks * 0.3, 10);
        score += Math.min(reliefMoments * 0.4, 15);
        score += Math.min(excitementSpikes * 0.5, 20);
        
        // Reward balanced win distribution
        const totalOutcomes = winDistribution.bigWins + winDistribution.mediumWins + 
                             winDistribution.smallWins + winDistribution.losses;
        const winVariety = [
            winDistribution.bigWins,
            winDistribution.mediumWins,
            winDistribution.smallWins
        ].filter(count => count > 0).length;
        
        score += winVariety * 8; // Up to 24 points for variety
        
        // Reward appropriate feature frequency (not too high, not too low)
        const idealFrequency = 0.15; // 15% feature trigger rate
        const frequencyScore = Math.max(0, 15 - Math.abs(featureFrequency - idealFrequency) * 100);
        score += frequencyScore;
        
        return Math.min(100, Math.max(0, score));
    }

    private savePatternResult(result: PatternTestResult): void {
        const filename = `pattern-${result.patternName.toLowerCase().replace(' ', '-')}-detailed.json`;
        const filepath = join(TEST_CONFIG.outputDir, filename);
        
        // Save detailed result (excluding raw chain data for file size)
        const detailedResult = {
            ...result,
            chainData: result.chainData.slice(0, 10) // Only save first 10 results as sample
        };
        
        writeFileSync(filepath, JSON.stringify(detailedResult, null, 2));
        
        // Save raw chain data separately if needed
        const chainFilename = `pattern-${result.patternName.toLowerCase().replace(' ', '-')}-chain.json`;
        const chainFilepath = join(TEST_CONFIG.outputDir, chainFilename);
        writeFileSync(chainFilepath, JSON.stringify(result.chainData, null, 2));
    }

    private generateSummary(totalExecutionTimeMs: number): TestSummary {
        const rtps = this.results.map(r => r.actualRTP);
        const averageRTP = rtps.reduce((sum, rtp) => sum + rtp, 0) / rtps.length;
        const rtpVariances = rtps.map(rtp => Math.pow(rtp - averageRTP, 2));
        const rtpStandardDeviation = Math.sqrt(rtpVariances.reduce((sum, v) => sum + v, 0) / rtpVariances.length);
        
        const bestRTPPattern = this.results.reduce((best, current) => 
            Math.abs(current.actualRTP - TEST_CONFIG.targetRTP) < Math.abs(best.actualRTP - TEST_CONFIG.targetRTP) ? current : best
        );
        
        const worstRTPPattern = this.results.reduce((worst, current) => 
            Math.abs(current.actualRTP - TEST_CONFIG.targetRTP) > Math.abs(worst.actualRTP - TEST_CONFIG.targetRTP) ? current : worst
        );
        
        const mostEngagingPattern = this.results.reduce((best, current) => 
            current.emotionalProfile.engagementScore > best.emotionalProfile.engagementScore ? current : best
        );
        
        // Generate recommendations
        const recommendations = this.generateRecommendations();
        
        return {
            testConfig: TEST_CONFIG,
            patterns: this.results,
            overallStats: {
                averageRTP,
                rtpStandardDeviation,
                bestPerformingPattern: bestRTPPattern.patternName,
                worstPerformingPattern: worstRTPPattern.patternName,
                mostEngagingPattern: mostEngagingPattern.patternName
            },
            recommendations,
            timestamp: new Date().toISOString(),
            totalExecutionTimeMs
        };
    }

    private generateRecommendations(): string[] {
        const recommendations: string[] = [];
        
        // RTP Performance Analysis
        const rtpDeviations = this.results.map(r => ({
            pattern: r.patternName,
            deviation: Math.abs(r.actualRTP - TEST_CONFIG.targetRTP)
        }));
        
        const highDeviationPatterns = rtpDeviations.filter(d => d.deviation > 0.05);
        if (highDeviationPatterns.length > 0) {
            recommendations.push(`Consider adjusting RTP parameters for patterns: ${highDeviationPatterns.map(p => p.pattern).join(', ')}`);
        }
        
        // Feature Trigger Analysis
        const avgFeatureRate = this.results.reduce((sum, r) => sum + r.featureStats.totalFeaturesTriggered, 0) / (this.results.length * TEST_CONFIG.chainLength);
        if (avgFeatureRate < 0.1) {
            recommendations.push('Feature trigger rates are low across patterns. Consider increasing base probabilities.');
        } else if (avgFeatureRate > 0.2) {
            recommendations.push('Feature trigger rates are high across patterns. Consider reducing to maintain balance.');
        }
        
        // Engagement Analysis
        const lowEngagementPatterns = this.results.filter(r => r.emotionalProfile.engagementScore < 50);
        if (lowEngagementPatterns.length > 0) {
            recommendations.push(`Low engagement patterns need improvement: ${lowEngagementPatterns.map(p => p.patternName).join(', ')}`);
        }
        
        // Win Distribution Analysis
        this.results.forEach(result => {
            const totalOutcomes = result.winDistribution.losses + result.winDistribution.smallWins + 
                                result.winDistribution.mediumWins + result.winDistribution.bigWins;
            const lossRate = result.winDistribution.losses / totalOutcomes;
            
            if (lossRate > 0.7) {
                recommendations.push(`${result.patternName} pattern has high loss rate (${(lossRate * 100).toFixed(1)}%) - consider more wins`);
            }
        });
        
        if (recommendations.length === 0) {
            recommendations.push('All patterns are performing well within acceptable parameters.');
        }
        
        return recommendations;
    }

    private saveSummary(summary: TestSummary): void {
        const filepath = join(TEST_CONFIG.outputDir, 'pattern-test-summary.json');
        writeFileSync(filepath, JSON.stringify(summary, null, 2));
        
        console.log('\n📊 PATTERN TEST SUMMARY');
        console.log('=' .repeat(50));
        console.log(`Average RTP: ${(summary.overallStats.averageRTP * 100).toFixed(2)}%`);
        console.log(`RTP Std Dev: ${(summary.overallStats.rtpStandardDeviation * 100).toFixed(2)}%`);
        console.log(`Best RTP Pattern: ${summary.overallStats.bestPerformingPattern}`);
        console.log(`Most Engaging: ${summary.overallStats.mostEngagingPattern}`);
        console.log(`Total Execution: ${summary.totalExecutionTimeMs}ms`);
        console.log('\n🎯 RECOMMENDATIONS:');
        summary.recommendations.forEach(rec => console.log(`- ${rec}`));
        console.log('=' .repeat(50));
        console.log(`\n💾 Results saved to: ${TEST_CONFIG.outputDir}/pattern-test-summary.json`);
    }

}

// Main execution
async function main() {
    try {
        console.log('🎰 Emotional Pattern Testing Suite');
        console.log('===================================\n');
        
        const tester = new EmotionalPatternTester();
        const summary = await tester.testAllPatterns();
        
        console.log('\n✅ Testing completed successfully!');
        console.log(`📁 Check ${TEST_CONFIG.outputDir} for detailed results.`);
        
    } catch (error) {
        console.error('❌ Testing failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { EmotionalPatternTester, TEST_CONFIG };
export type { PatternTestResult, TestSummary };
