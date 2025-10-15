#!/usr/bin/env ts-node

/**
 * Chain Symbol Analysis Script
 * Analyzes generated result chains to verify symbol distribution and winning patterns
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SymbolWinStats {
    symbol: number;
    winCount: number;
    totalSymbolsInWins: number;
    avgSymbolsPerWin: number;
    percentage: number;
}

interface ChainAnalysisResult {
    filename: string;
    pattern: string;
    totalBoards: number;
    winningBoards: number;
    noWinBoards: number;
    symbolWinDistribution: SymbolWinStats[];
    strategyUsage: {
        [strategy: string]: number;
    };
    avgTumblesPerBoard: number;
    avgWinAmount: number;
    totalWagered: number;
    totalWon: number;
    actualRTP: number;
}

/**
 * Analyze a single chain file
 */
function analyzeChainFile(filePath: string): ChainAnalysisResult | null {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const filename = filePath.split(/[/\\]/).pop() || '';
        const pattern = data.metadata?.patternType || 'unknown';
        const boards = data.boards || [];
        
        // Symbol win tracking
        const symbolWins: { [symbol: number]: { count: number; totalSymbols: number } } = {};
        
        // Strategy tracking
        const strategyUsage: { [strategy: string]: number } = {};
        
        let totalTumbles = 0;
        let totalWon = 0;
        let winningBoards = 0;
        let noWinBoards = 0;
        
        // Analyze each board
        boards.forEach((board: any) => {
            const tumbles = board.settlementResult?.tumbles || [];
            totalTumbles += tumbles.length;
            
            const boardWin = board.totalWin || board.totalTumbleWin || 0;
            totalWon += boardWin;
            
            if (boardWin > 0) {
                winningBoards++;
            } else {
                noWinBoards++;
            }
            
            // Analyze tumbles for winning symbols
            tumbles.forEach((tumble: any) => {
                const icons = tumble.icons || {};
                
                Object.keys(icons).forEach((symbolStr) => {
                    const symbol = parseInt(symbolStr);
                    const iconData = icons[symbolStr];
                    const count = iconData.count || 0;
                    
                    if (!symbolWins[symbol]) {
                        symbolWins[symbol] = { count: 0, totalSymbols: 0 };
                    }
                    
                    symbolWins[symbol].count++;
                    symbolWins[symbol].totalSymbols += count;
                });
            });
        });
        
        // Calculate symbol win distribution
        const totalWins = Object.values(symbolWins).reduce((sum, stat) => sum + stat.count, 0);
        
        const symbolWinDistribution: SymbolWinStats[] = Object.entries(symbolWins)
            .map(([symbolStr, stats]) => ({
                symbol: parseInt(symbolStr),
                winCount: stats.count,
                totalSymbolsInWins: stats.totalSymbols,
                avgSymbolsPerWin: stats.totalSymbols / stats.count,
                percentage: (stats.count / totalWins) * 100
            }))
            .sort((a, b) => a.symbol - b.symbol);
        
        // Calculate metrics
        const betData = data.metadata?.betData || { totalBetAmount: 20 };
        const totalBetAmount = betData.totalBetAmount || betData.betAmount || 20;
        const totalWagered = boards.length * totalBetAmount;
        const actualRTP = totalWagered > 0 ? (totalWon / totalWagered) : 0;
        const avgTumblesPerBoard = boards.length > 0 ? totalTumbles / boards.length : 0;
        const avgWinAmount = boards.length > 0 ? totalWon / boards.length : 0;
        
        return {
            filename,
            pattern,
            totalBoards: boards.length,
            winningBoards,
            noWinBoards,
            symbolWinDistribution,
            strategyUsage,
            avgTumblesPerBoard,
            avgWinAmount,
            totalWagered,
            totalWon,
            actualRTP
        };
        
    } catch (error) {
        console.error(`❌ Error analyzing ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Print analysis results
 */
function printAnalysis(result: ChainAnalysisResult) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 CHAIN ANALYSIS: ${result.filename}`);
    console.log('='.repeat(80));
    
    console.log(`\n🎭 Pattern: ${result.pattern.toUpperCase()}`);
    console.log(`📋 Total Boards: ${result.totalBoards}`);
    console.log(`   ✅ Winning: ${result.winningBoards} (${((result.winningBoards / result.totalBoards) * 100).toFixed(1)}%)`);
    console.log(`   ❌ No Win: ${result.noWinBoards} (${((result.noWinBoards / result.totalBoards) * 100).toFixed(1)}%)`);
    console.log(`   🎲 Avg Tumbles: ${result.avgTumblesPerBoard.toFixed(2)}`);
    
    console.log(`\n💰 Financial Metrics:`);
    console.log(`   Wagered: ${result.totalWagered.toFixed(2)}`);
    console.log(`   Won: ${result.totalWon.toFixed(2)}`);
    console.log(`   RTP: ${(result.actualRTP * 100).toFixed(2)}%`);
    console.log(`   Avg Win/Board: ${result.avgWinAmount.toFixed(2)}`);
    
    console.log(`\n🎯 WINNING SYMBOL DISTRIBUTION:`);
    console.log('─'.repeat(80));
    console.log('Symbol │ Wins │ % of Total │ Avg Count │ Symbol Odds Info');
    console.log('───────┼──────┼────────────┼───────────┼─────────────────────────');
    
    const symbolInfo: { [key: number]: string } = {
        0: '5x-40x (Low)',
        1: '8x-80x (Low)',
        2: '10x-100x (Low)',
        3: '16x-160x (Low-Mid)',
        4: '20x-200x (Mid)',
        5: '30x-240x (Mid) ⭐',
        6: '40x-300x (Mid-High) ⭐⭐',
        7: '50x-500x (Premium) 💎',
        8: '200x-1000x (Ultra-Premium) 💎💎',
        9: 'Scatter (Free Spins) 🎁',
    };
    
    result.symbolWinDistribution.forEach(stat => {
        const info = symbolInfo[stat.symbol] || 'Unknown';
        console.log(
            `   ${stat.symbol}   │ ${stat.winCount.toString().padStart(4)} │ ` +
            `${stat.percentage.toFixed(1).padStart(9)}% │ ` +
            `${stat.avgSymbolsPerWin.toFixed(1).padStart(8)} │ ${info}`
        );
    });
    
    // Analysis interpretation
    console.log('\n📈 ANALYSIS:');
    
    const symbol5Pct = result.symbolWinDistribution.find(s => s.symbol === 5)?.percentage || 0;
    const symbol6Pct = result.symbolWinDistribution.find(s => s.symbol === 6)?.percentage || 0;
    const symbol7Pct = result.symbolWinDistribution.find(s => s.symbol === 7)?.percentage || 0;
    const symbol8Pct = result.symbolWinDistribution.find(s => s.symbol === 8)?.percentage || 0;
    
    const premiumTotal = symbol7Pct + symbol8Pct;
    const mediumTotal = symbol5Pct + symbol6Pct;
    
    if (result.pattern === 'cliffhanger') {
        console.log(`   Premium Symbols (7-8): ${premiumTotal.toFixed(1)}% of wins`);
        if (premiumTotal < 30) {
            console.log(`   ⚠️  WARNING: Expected 40-60% premium wins for Cliffhanger, got ${premiumTotal.toFixed(1)}%`);
        } else {
            console.log(`   ✅ Good: Premium symbol wins match Cliffhanger expectation`);
        }
        
        if (symbol5Pct > 40) {
            console.log(`   ⚠️  WARNING: Symbol 5 dominates at ${symbol5Pct.toFixed(1)}% (should be <30%)`);
        }
        
        if (symbol8Pct > 0) {
            console.log(`   ✅ Excellent: Symbol 8 (ultra-premium) appears in ${symbol8Pct.toFixed(1)}% of wins`);
        } else {
            console.log(`   ⚠️  Symbol 8 (200x-1000x) not appearing - mega wins missing!`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);
    const chainOutputDir = join(__dirname, '../../../../chain-output');
    
    console.log('🔍 Chain Symbol Analysis Tool');
    console.log(`📁 Scanning: ${chainOutputDir}\n`);
    
    // Get target file
    let targetFiles: string[] = [];
    
    if (args.length > 0) {
        // Specific file provided
        const filename = args[0];
        targetFiles = [join(chainOutputDir, filename)];
    } else {
        // Find most recent cliffhanger file
        try {
            const files = readdirSync(chainOutputDir)
                .filter(f => f.includes('cliffhanger') && f.endsWith('.json') && !f.includes('summary'))
                .map(f => ({
                    name: f,
                    path: join(chainOutputDir, f),
                    time: readFileSync(join(chainOutputDir, f), 'utf-8').match(/"generatedAt":\s*"([^"]+)"/)?.[1] || ''
                }))
                .sort((a, b) => b.time.localeCompare(a.time));
            
            if (files.length > 0) {
                console.log(`🎯 Found ${files.length} cliffhanger chain file(s)`);
                console.log(`📊 Analyzing most recent: ${files[0].name}\n`);
                targetFiles = [files[0].path];
            } else {
                console.log('❌ No cliffhanger chain files found in chain-output directory');
                console.log('💡 Usage: npm run analyze-chain-symbols [filename.json]');
                return;
            }
        } catch (error) {
            console.error('❌ Error reading chain-output directory:', error.message);
            return;
        }
    }
    
    // Analyze files
    targetFiles.forEach(filePath => {
        const result = analyzeChainFile(filePath);
        if (result) {
            printAnalysis(result);
        }
    });
}

export { analyzeChainFile, printAnalysis };

// Run if executed directly (ESM compatible)
main();

