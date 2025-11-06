#!/usr/bin/env ts-node

/**
 * Free Spin Analysis Script
 * Analyzes free spin awards in generated chain files to understand:
 * 1. How many free spins are awarded when triggered
 * 2. Distribution of free spin awards (4, 5, 6+ scatters)
 * 3. Retrigger patterns and additional spins
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateFreeSpinAward } from '../utils/free-spin-utils';
import { defaultOdds } from '../../generator-definition';

interface FreeSpinTrigger {
    boardIndex: number;
    scatterCount: number;
    freeSpinsAwarded: number;
    payoutOdds: number;
}

interface FreeSpinBoard {
    boardIndex: number;
    spinIndex: number;
    remainingSpins: number;
    accumulatedMultiplier: number;
    win: number;
}

interface Retrigger {
    boardIndex: number;
    scatterCount: number;
    additionalSpins: number;
    spinNumber: number;
}

interface FreeSpinSequence {
    triggerBoard: number;
    initialFreeSpins: number;
    totalFreeSpins: number;
    freeSpinBoards: FreeSpinBoard[];
    retriggers: Retrigger[];
}

interface ChainAnalysis {
    fileName: string;
    totalBoards: number;
    freeSpinTriggers: FreeSpinTrigger[];
    freeSpinSequences: FreeSpinSequence[];
    retriggers: Retrigger[];
    statistics: {
        triggersCount: number;
        totalFreeSpinsAwarded: number;
        retriggersCount: number;
        totalRetriggerSpins: number;
    };
}

interface SummaryReport {
    totalChainFiles: number;
    totalBoards: number;
    freeSpinStatistics: {
        totalTriggers: number;
        totalFreeSpinsAwarded: number;
        totalRetriggers: number;
        totalRetriggerSpins: number;
    };
    scatterDistribution: Record<number, number>;
    averagesPerChain: {
        triggersPerChain: number;
        freeSpinsPerChain: number;
        retriggersPerChain: number;
        retriggerSpinsPerChain: number;
    };
    freeSpinAwardPatterns: {
        standardAward: number;
        baseGameTriggers: Record<number, string>;
        retriggerAward: string;
    };
}

interface ChainData {
    boards: Array<{
        isFreeSpin?: boolean;
        settlementResult?: {
            freeSpins?: {
                count: number;
                odds: number;
            };
        };
        freeSpinsPlayed?: number;
        remainingFreeSpins?: number;
        accumulatedMultiplier?: number;
        totalWin?: number;
    }>;
}


function analyzeChainFile(filePath: string): ChainAnalysis | null {
    try {
        const data: ChainData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const boards = data.boards || [];
        
        const analysis: ChainAnalysis = {
            fileName: path.basename(filePath),
            totalBoards: boards.length,
            freeSpinTriggers: [],
            freeSpinSequences: [],
            retriggers: [],
            statistics: {
                triggersCount: 0,
                totalFreeSpinsAwarded: 0,
                retriggersCount: 0,
                totalRetriggerSpins: 0
            }
        };

        let currentFreeSpinSequence: FreeSpinSequence | null = null;

        boards.forEach((board, index) => {
            // Check for free spin triggers in base game
            if (!board.isFreeSpin && board.settlementResult?.freeSpins?.count && board.settlementResult.freeSpins.count > 0) {
                const scatterCount = board.settlementResult.freeSpins.count;
                const freeSpinsAwarded = calculateFreeSpinAward(scatterCount, false);
                
                // Get payout odds from generator-definition
                const scatterSymbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === 9);
                const payoutRule = scatterSymbolConfig?.payout.find(p => scatterCount >= p.from && scatterCount <= p.to);
                
                const trigger: FreeSpinTrigger = {
                    boardIndex: index,
                    scatterCount: scatterCount,
                    freeSpinsAwarded: freeSpinsAwarded,
                    payoutOdds: payoutRule?.odds || 0
                };
                
                analysis.freeSpinTriggers.push(trigger);
                analysis.statistics.triggersCount++;
                analysis.statistics.totalFreeSpinsAwarded += freeSpinsAwarded;
                
                // Start tracking free spin sequence
                currentFreeSpinSequence = {
                    triggerBoard: index,
                    initialFreeSpins: freeSpinsAwarded,
                    totalFreeSpins: freeSpinsAwarded,
                    freeSpinBoards: [],
                    retriggers: []
                };
            }

            // Track free spin boards
            if (board.isFreeSpin && currentFreeSpinSequence) {
                const freeSpinBoard: FreeSpinBoard = {
                    boardIndex: index,
                    spinIndex: board.freeSpinsPlayed || 0,
                    remainingSpins: board.remainingFreeSpins || 0,
                    accumulatedMultiplier: board.accumulatedMultiplier || 0,
                    win: board.totalWin || 0
                };

                // Check for retriggers during free spins
                const minRetriggerCount = defaultOdds.freeSpins.additionalOdds[0]?.count || 3;
                if (board.settlementResult?.freeSpins?.count && board.settlementResult.freeSpins.count >= minRetriggerCount) {
                    const additionalSpins = calculateFreeSpinAward(board.settlementResult.freeSpins.count, true);
                    const retrigger: Retrigger = {
                        boardIndex: index,
                        scatterCount: board.settlementResult.freeSpins.count,
                        additionalSpins: additionalSpins,
                        spinNumber: board.freeSpinsPlayed || 0
                    };
                    
                    analysis.retriggers.push(retrigger);
                    currentFreeSpinSequence.retriggers.push(retrigger);
                    currentFreeSpinSequence.totalFreeSpins += additionalSpins;
                    analysis.statistics.retriggersCount++;
                    analysis.statistics.totalRetriggerSpins += additionalSpins;
                }

                currentFreeSpinSequence.freeSpinBoards.push(freeSpinBoard);

                // End of free spin sequence
                if (board.remainingFreeSpins === 0) {
                    analysis.freeSpinSequences.push(currentFreeSpinSequence);
                    currentFreeSpinSequence = null;
                }
            }
        });

        return analysis;
    } catch (error) {
        console.error(`Error analyzing ${filePath}:`, (error as Error).message);
        return null;
    }
}

function analyzeAllChainFiles(): ChainAnalysis[] {
    const chainOutputDir = './chain-output';
    const results: ChainAnalysis[] = [];
    
    // Get all subdirectories
    const subdirs = fs.readdirSync(chainOutputDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    subdirs.forEach(subdir => {
        const subdirPath = path.join(chainOutputDir, subdir);
        const files = fs.readdirSync(subdirPath)
            .filter(file => file.endsWith('.json') && !file.includes('generation-summary'));

        files.forEach(file => {
            const filePath = path.join(subdirPath, file);
            const analysis = analyzeChainFile(filePath);
            if (analysis) {
                results.push(analysis);
            }
        });
    });

    return results;
}

function generateSummaryReport(analyses: ChainAnalysis[]): SummaryReport {
    const summary: SummaryReport = {
        totalChainFiles: analyses.length,
        totalBoards: analyses.reduce((sum, a) => sum + a.totalBoards, 0),
        freeSpinStatistics: {
            totalTriggers: analyses.reduce((sum, a) => sum + a.statistics.triggersCount, 0),
            totalFreeSpinsAwarded: analyses.reduce((sum, a) => sum + a.statistics.totalFreeSpinsAwarded, 0),
            totalRetriggers: analyses.reduce((sum, a) => sum + a.statistics.retriggersCount, 0),
            totalRetriggerSpins: analyses.reduce((sum, a) => sum + a.statistics.totalRetriggerSpins, 0)
        },
        scatterDistribution: { 4: 0, 5: 0, 6: 0 },
        averagesPerChain: {
            triggersPerChain: 0,
            freeSpinsPerChain: 0,
            retriggersPerChain: 0,
            retriggerSpinsPerChain: 0
        },
        freeSpinAwardPatterns: {
            standardAward: 15,
            baseGameTriggers: {},
            retriggerAward: ''
        }
    };

    // Analyze scatter distribution
    analyses.forEach(analysis => {
        analysis.freeSpinTriggers.forEach(trigger => {
            const count = Math.min(trigger.scatterCount, 6); // Group 6+ together
            summary.scatterDistribution[count] = (summary.scatterDistribution[count] || 0) + 1;
        });
    });

    // Calculate averages
    if (summary.totalChainFiles > 0) {
        summary.averagesPerChain = {
            triggersPerChain: summary.freeSpinStatistics.totalTriggers / summary.totalChainFiles,
            freeSpinsPerChain: summary.freeSpinStatistics.totalFreeSpinsAwarded / summary.totalChainFiles,
            retriggersPerChain: summary.freeSpinStatistics.totalRetriggers / summary.totalChainFiles,
            retriggerSpinsPerChain: summary.freeSpinStatistics.totalRetriggerSpins / summary.totalChainFiles
        };
    }

    // Analyze free spin award patterns using actual configuration
    const scatterSymbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === 9);
    const baseGameTriggers: Record<number, string> = {};
    
    defaultOdds.freeSpins.initialOdds.forEach(rule => {
        const payoutRule = scatterSymbolConfig?.payout.find(p => rule.count >= p.from && rule.count <= p.to);
        baseGameTriggers[rule.count] = `${rule.odds} free spins + ${payoutRule?.odds || 0}x payout`;
    });

    summary.freeSpinAwardPatterns = {
        standardAward: 15,
        baseGameTriggers,
        retriggerAward: `${defaultOdds.freeSpins.additionalOdds[0]?.odds || 0} additional spins for ${defaultOdds.freeSpins.additionalOdds[0]?.count || 0}+ scatters during free spins`
    };

    return summary;
}

function main(): SummaryReport {
    console.log('🎰 Free Spin Analysis Report');
    console.log('============================\n');

    const analyses = analyzeAllChainFiles();
    const summary = generateSummaryReport(analyses);

    console.log('📊 SUMMARY STATISTICS');
    console.log('---------------------');
    console.log(`Total Chain Files Analyzed: ${summary.totalChainFiles}`);
    console.log(`Total Boards Analyzed: ${summary.totalBoards}`);
    console.log(`Total Free Spin Triggers: ${summary.freeSpinStatistics.totalTriggers}`);
    console.log(`Total Free Spins Awarded: ${summary.freeSpinStatistics.totalFreeSpinsAwarded}`);
    console.log(`Total Retriggers: ${summary.freeSpinStatistics.totalRetriggers}`);
    console.log(`Total Retrigger Spins: ${summary.freeSpinStatistics.totalRetriggerSpins}\n`);

    console.log('🎯 FREE SPIN AWARD RULES (Current Configuration)');
    console.log('------------------------------------------------');
    console.log('Base Game Triggers:');
    Object.entries(summary.freeSpinAwardPatterns.baseGameTriggers).forEach(([scatters, award]) => {
        console.log(`  ${scatters} Zeus Scatters → ${award}`);
    });
    console.log(`Retrigger Rule: ${summary.freeSpinAwardPatterns.retriggerAward}\n`);

    console.log('📈 SCATTER DISTRIBUTION');
    console.log('----------------------');
    Object.entries(summary.scatterDistribution).forEach(([count, occurrences]) => {
        const percentage = ((occurrences / summary.freeSpinStatistics.totalTriggers) * 100).toFixed(1);
        const label = count === '6' ? '6+ scatters' : `${count} scatters`;
        console.log(`${label}: ${occurrences} triggers (${percentage}%)`);
    });

    console.log('\n⚡ AVERAGES PER CHAIN');
    console.log('--------------------');
    console.log(`Free Spin Triggers: ${summary.averagesPerChain.triggersPerChain?.toFixed(2) || 0}`);
    console.log(`Free Spins Awarded: ${summary.averagesPerChain.freeSpinsPerChain?.toFixed(2) || 0}`);
    console.log(`Retriggers: ${summary.averagesPerChain.retriggersPerChain?.toFixed(2) || 0}`);
    console.log(`Retrigger Spins: ${summary.averagesPerChain.retriggerSpinsPerChain?.toFixed(2) || 0}\n`);

    console.log('🔍 KEY FINDINGS');
    console.log('---------------');
    console.log(`✓ Free spins configuration from generator-definition.ts:`);
    defaultOdds.freeSpins.initialOdds.forEach(rule => {
        const scatterSymbolConfig = defaultOdds.normalSymbols.find(s => s.symbol === 9);
        const payoutRule = scatterSymbolConfig?.payout.find(p => rule.count >= p.from && rule.count <= p.to);
        console.log(`  • ${rule.count} scatters → ${rule.odds} free spins + ${payoutRule?.odds || 0}x payout`);
    });
    console.log(`✓ Retriggers award ${defaultOdds.freeSpins.additionalOdds[0]?.odds || 0} additional spins when ${defaultOdds.freeSpins.additionalOdds[0]?.count || 0}+ scatters appear during free spins`);
    console.log(`✓ Scatter symbol ${defaultOdds.freeSpins.symbol} triggers both free spins AND payout multipliers\n`);

    // Save detailed analysis
    const outputFile = './freespin-analysis-report.json';
    const report = {
        timestamp: new Date().toISOString(),
        summary,
        detailedAnalyses: analyses.map(a => ({
            fileName: a.fileName,
            statistics: a.statistics,
            triggerCount: a.freeSpinTriggers.length,
            retriggerCount: a.retriggers.length
        }))
    };

    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${outputFile}`);

    return summary;
}

// Run main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('analyze-freespins.ts')) {
    // Check if a specific file was provided as argument
    const specificFile = process.argv[2];
    if (specificFile) {
        console.log(`🎯 Analyzing specific file: ${specificFile}\n`);
        try {
            const analysis = analyzeChainFile(specificFile);
            if (analysis) {
                console.log('📊 ANALYSIS RESULTS');
                console.log('------------------');
                console.log(`File: ${analysis.fileName}`);
                console.log(`Total Boards: ${analysis.totalBoards}`);
                console.log(`Free Spin Triggers: ${analysis.statistics.triggersCount}`);
                console.log(`Total Free Spins Awarded: ${analysis.statistics.totalFreeSpinsAwarded}`);
                console.log(`Retriggers: ${analysis.statistics.retriggersCount}`);
                console.log(`Total Retrigger Spins: ${analysis.statistics.totalRetriggerSpins}`);

                console.log('\n🎯 FREE SPIN TRIGGER DETAILS');
                console.log('---------------------------');
                analysis.freeSpinTriggers.forEach(trigger => {
                    console.log(`Board ${trigger.boardIndex}: ${trigger.scatterCount} scatters → ${trigger.freeSpinsAwarded} free spins`);
                });

                if (analysis.retriggers.length > 0) {
                    console.log('\n🔄 RETRIGGER DETAILS');
                    console.log('-------------------');
                    analysis.retriggers.forEach(retrigger => {
                        console.log(`Board ${retrigger.boardIndex}: ${retrigger.scatterCount} scatters → ${retrigger.additionalSpins} additional spins`);
                    });
                }
            } else {
                console.log('❌ Failed to analyze the file');
            }
        } catch (error) {
            console.log(`❌ Error analyzing file: ${error.message}`);
        }
    } else {
        main();
    }
}

export { analyzeChainFile, analyzeAllChainFiles, generateSummaryReport, main };
