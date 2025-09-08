/**
 * Comprehensive Result Chain Verification Test
 * Analyzes generated result chains for:
 * - RTP calculation accuracy
 * - Free spin execution
 * - Scatter symbol frequency
 * - Main game performance
 * - Overall system health
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

interface BoardResult {
    board: number[];
    multipliers: number[];
    totalCascadeWin: number;
    remainingFreeSpins?: number;
    freeSpinsPlayed?: number;
    freeSpinWins?: number;
    isFreeSpin: boolean;
    settlementResult?: {
        freeSpins: { count: number; odds: number };
        tumbles: any[];
    };
}

interface ResultChain {
    boards: BoardResult[];
    metadata: {
        pattern: string;
        boardCount: number;
        targetRTP: number;
        actualRTP: number;
        generationTime: number;
        attempts: number;
    };
}

class ChainVerificationTest {
    private betSize = 1.0; // Actual betSize used by generate-chains script
    
    /**
     * Load and analyze a result chain JSON file
     */
    async analyzeChain(filename: string): Promise<void> {
        console.log('🔍 COMPREHENSIVE CHAIN VERIFICATION');
        console.log('===================================');
        console.log(`📄 File: ${filename}`);
        console.log('');

        try {
            const chainPath = join(process.cwd(), 'chain-output', filename);
            const chainData: ResultChain = JSON.parse(readFileSync(chainPath, 'utf8'));
            
            // Basic chain info
            this.displayBasicInfo(chainData);
            
            // RTP Analysis
            this.analyzeRTP(chainData);
            
            // Scatter Symbol Analysis
            this.analyzeScatterSymbols(chainData);
            
            // Free Spin Analysis
            this.analyzeFreeSpins(chainData);
            
            // Main Game Analysis
            this.analyzeMainGame(chainData);
            
            // Overall Assessment
            this.provideAssessment(chainData);
            
        } catch (error) {
            console.error('❌ Error loading chain file:', error);
        }
    }

    private displayBasicInfo(chain: ResultChain): void {
        console.log('📊 BASIC CHAIN INFORMATION:');
        console.log(`Pattern: ${chain.metadata?.pattern || 'Unknown'}`);
        console.log(`Board Count: ${chain.boards.length}`);
        console.log(`Target RTP: ${(chain.metadata?.targetRTP * 100 || 0).toFixed(1)}%`);
        console.log(`Generation Attempts: ${chain.metadata?.attempts || 'Unknown'}`);
        console.log(`Generation Time: ${chain.metadata?.generationTime || 0}ms`);
        console.log('');
    }

    private analyzeRTP(chain: ResultChain): void {
        console.log('💰 RTP ANALYSIS:');
        
        const totalBet = chain.boards.length * this.betSize;
        const totalWins = chain.boards.reduce((sum, board) => sum + (board.totalCascadeWin || 0), 0);
        const calculatedRTP = totalWins / totalBet;
        
        console.log(`Total Bet Amount: $${totalBet}`);
        console.log(`Total Winnings: $${totalWins.toFixed(2)}`);
        console.log(`Calculated RTP: ${(calculatedRTP * 100).toFixed(2)}%`);
        
        // RTP Health Check
        const targetRTP = chain.metadata?.targetRTP || 0.97;
        const rtpDifference = Math.abs(calculatedRTP - targetRTP) * 100;
        
        if (rtpDifference <= 2) {
            console.log('✅ RTP Status: EXCELLENT - Within ±2% of target');
        } else if (rtpDifference <= 5) {
            console.log('⚠️  RTP Status: ACCEPTABLE - Within ±5% of target');
        } else {
            console.log(`❌ RTP Status: CRITICAL - ${rtpDifference.toFixed(1)}% off target`);
        }
        
        console.log('');
    }

    private analyzeScatterSymbols(chain: ResultChain): void {
        console.log('🎯 SCATTER SYMBOL ANALYSIS:');
        
        let totalScatters = 0;
        let boards1Plus = 0;
        let boards3Plus = 0;
        let boards5Plus = 0;
        let maxOnBoard = 0;
        
        chain.boards.forEach(board => {
            const scatterCount = board.board.filter(symbol => symbol === 9).length;
            totalScatters += scatterCount;
            
            if (scatterCount > 0) boards1Plus++;
            if (scatterCount >= 3) boards3Plus++;
            if (scatterCount >= 5) boards5Plus++;
            if (scatterCount > maxOnBoard) maxOnBoard = scatterCount;
        });
        
        const boards1PlusPct = (boards1Plus / chain.boards.length * 100).toFixed(1);
        const boards3PlusPct = (boards3Plus / chain.boards.length * 100).toFixed(1);
        const boards5PlusPct = (boards5Plus / chain.boards.length * 100).toFixed(1);
        const avgScatters = (totalScatters / chain.boards.length).toFixed(2);
        
        console.log(`Total Scatter Symbols: ${totalScatters}`);
        console.log(`Boards with Any Scatters: ${boards1Plus} (${boards1PlusPct}%)`);
        console.log(`Boards with 3+ Scatters: ${boards3Plus} (${boards3PlusPct}%) - Free Spin Eligible`);
        console.log(`Boards with 5+ Scatters: ${boards5Plus} (${boards5PlusPct}%) - High Value`);
        console.log(`Max Scatters on One Board: ${maxOnBoard}`);
        console.log(`Average Scatters per Board: ${avgScatters}`);
        
        // Scatter Health Check
        if (boards3Plus >= 15) {
            console.log('✅ Scatter Frequency: EXCELLENT - Good free spin potential');
        } else if (boards3Plus >= 5) {
            console.log('⚠️  Scatter Frequency: MODERATE - Limited free spin opportunities');
        } else {
            console.log('❌ Scatter Frequency: TOO LOW - Insufficient free spin triggers');
        }
        
        console.log('');
    }

    private analyzeFreeSpins(chain: ResultChain): void {
        console.log('🎰 FREE SPIN ANALYSIS:');
        
        let boardsAwarded = 0;
        let totalAwarded = 0;
        let totalPlayed = 0;
        let totalWins = 0;
        let totalRemaining = 0;
        
        const awardDetails: Array<{board: number, awarded: number, played: number, wins: number, remaining: number}> = [];
        
        chain.boards.forEach((board, index) => {
            const awarded = board.settlementResult?.freeSpins?.odds || 0;
            const played = board.freeSpinsPlayed || 0;
            const wins = board.freeSpinWins || 0;
            const remaining = board.remainingFreeSpins || 0;
            
            if (awarded > 0 || played > 0 || remaining > 0) {
                boardsAwarded++;
                totalAwarded += awarded;
                totalPlayed += played;
                totalWins += wins;
                totalRemaining += remaining;
                
                awardDetails.push({
                    board: index + 1,
                    awarded,
                    played,
                    wins,
                    remaining
                });
            }
        });
        
        console.log(`Boards with Free Spin Activity: ${boardsAwarded}`);
        console.log(`Total Free Spins Awarded: ${totalAwarded}`);
        console.log(`Total Free Spins Played: ${totalPlayed}`);
        console.log(`Total Free Spin Wins: $${totalWins.toFixed(2)}`);
        console.log(`Total Remaining (Unplayed): ${totalRemaining}`);
        
        if (totalPlayed > 0) {
            console.log(`Average Win per Free Spin: $${(totalWins / totalPlayed).toFixed(2)}`);
        }
        
        // Show top 5 free spin awards
        if (awardDetails.length > 0) {
            console.log('\n🏆 TOP FREE SPIN AWARDS:');
            awardDetails
                .sort((a, b) => (b.awarded + b.played) - (a.awarded + a.played))
                .slice(0, 5)
                .forEach(detail => {
                    console.log(`  Board ${detail.board}: Awarded ${detail.awarded}, Played ${detail.played}, Won $${detail.wins.toFixed(2)}, Remaining ${detail.remaining}`);
                    
                    // Show free spin board details if available
                    const boardData = chain.boards[detail.board - 1] as any;
                    if (boardData.freeSpinBoards && boardData.freeSpinBoards.length > 0) {
                        console.log(`    🎰 Free Spin Boards Captured: ${boardData.freeSpinBoards.length}`);
                        const sampleBoard = boardData.freeSpinBoards[0];
                        console.log(`    📋 Sample Free Spin: Win $${sampleBoard.win}, Cascades ${sampleBoard.cascadeCount}, Remaining ${sampleBoard.spinsRemaining}`);
                        
                        const retriggers = boardData.freeSpinBoards.filter((board: any) => board.isRetrigger);
                        if (retriggers.length > 0) {
                            console.log(`    🔄 Retriggered ${retriggers.length} times with ${retriggers.reduce((sum: any, r: any) => sum + (r.retriggeredSpins || 0), 0)} additional spins`);
                        }
                    }
                });
        }
        
        // Free Spin Health Check
        if (totalPlayed > 0 && totalRemaining === 0) {
            console.log('✅ Free Spin Execution: PERFECT - All free spins executed immediately');
        } else if (totalRemaining > 0 && totalPlayed === 0) {
            console.log('❌ Free Spin Execution: BROKEN - Awards tracked but not executed');
        } else if (totalPlayed === 0 && totalAwarded === 0) {
            console.log('⚠️  Free Spin Execution: NONE - No free spins awarded (check scatter frequency)');
        } else {
            console.log('⚠️  Free Spin Execution: MIXED - Partial execution detected');
        }
        
        // Verify free spin board data capture
        const boardsWithFreeSpinData = chain.boards.filter(board => 
            (board as any).freeSpinBoards && (board as any).freeSpinBoards.length > 0).length;
        
        if (boardsWithFreeSpinData > 0) {
            console.log(`✅ Free Spin Board Data: ${boardsWithFreeSpinData} boards contain complete free spin sequences`);
        } else if (totalPlayed > 0) {
            console.log('❌ Free Spin Board Capture: MISSING - Free spins executed but no board data captured');
        }
        
        console.log('');
    }

    private analyzeMainGame(chain: ResultChain): void {
        console.log('🎮 MAIN GAME ANALYSIS:');
        
        const winningBoards = chain.boards.filter(board => (board.totalCascadeWin || 0) > 0);
        const hitFrequency = (winningBoards.length / chain.boards.length * 100).toFixed(1);
        
        // Win size distribution
        const winSizes = {
            small: 0,  // 0.1x - 1x bet
            medium: 0, // 1x - 5x bet
            large: 0,  // 5x+ bet
        };
        
        winningBoards.forEach(board => {
            const winMultiplier = (board.totalCascadeWin || 0) / this.betSize;
            if (winMultiplier < 1) {
                winSizes.small++;
            } else if (winMultiplier < 5) {
                winSizes.medium++;
            } else {
                winSizes.large++;
            }
        });
        
        // Top wins
        const topWins = winningBoards
            .sort((a, b) => (b.totalCascadeWin || 0) - (a.totalCascadeWin || 0))
            .slice(0, 5);
        
        console.log(`Hit Frequency: ${hitFrequency}% (${winningBoards.length}/${chain.boards.length})`);
        console.log(`Win Distribution: Small: ${winSizes.small}, Medium: ${winSizes.medium}, Large: ${winSizes.large}`);
        console.log(`Average Win (when winning): $${(winningBoards.reduce((sum, board) => sum + (board.totalCascadeWin || 0), 0) / winningBoards.length).toFixed(2)}`);
        
        if (topWins.length > 0) {
            console.log('\n💎 TOP WINS:');
            topWins.forEach((board, index) => {
                const boardIndex = chain.boards.indexOf(board) + 1;
                const multiplier = ((board.totalCascadeWin || 0) / this.betSize).toFixed(1);
                console.log(`  ${index + 1}. Board ${boardIndex}: $${(board.totalCascadeWin || 0).toFixed(2)} (${multiplier}x bet)`);
            });
        }
        
        console.log('');
    }

    private provideAssessment(chain: ResultChain): void {
        console.log('🎯 OVERALL ASSESSMENT:');
        
        const totalBet = chain.boards.length * this.betSize;
        const totalWins = chain.boards.reduce((sum, board) => sum + (board.totalCascadeWin || 0), 0);
        const calculatedRTP = totalWins / totalBet;
        const targetRTP = chain.metadata?.targetRTP || 0.97;
        
        const totalFreeSpinsPlayed = chain.boards.reduce((sum, board) => sum + (board.freeSpinsPlayed || 0), 0);
        const boards3PlusScatters = chain.boards.filter(board => board.board.filter(s => s === 9).length >= 3).length;
        
        console.log('System Health Indicators:');
        
        // RTP Health
        if (Math.abs(calculatedRTP - targetRTP) <= 0.02) {
            console.log('✅ RTP Targeting: EXCELLENT');
        } else {
            console.log('❌ RTP Targeting: NEEDS ATTENTION');
        }
        
        // Free Spin Health
        if (totalFreeSpinsPlayed > 0) {
            console.log('✅ Free Spin Execution: WORKING');
        } else if (boards3PlusScatters > 0) {
            console.log('⚠️  Free Spin Execution: ELIGIBLE BUT NOT TRIGGERING');
        } else {
            console.log('❌ Free Spin Execution: NO ELIGIBLE BOARDS');
        }
        
        // Scatter Health
        if (boards3PlusScatters >= 15) {
            console.log('✅ Scatter Generation: OPTIMAL');
        } else if (boards3PlusScatters >= 5) {
            console.log('⚠️  Scatter Generation: ACCEPTABLE');
        } else {
            console.log('❌ Scatter Generation: INSUFFICIENT');
        }
        
        // Overall recommendation
        console.log('\n🚀 RECOMMENDATIONS:');
        if (calculatedRTP < 0.50) {
            console.log('🔧 CRITICAL: Main game payouts appear broken - investigate settlement calculation');
        }
        if (boards3PlusScatters === 0) {
            console.log('🔧 CRITICAL: Increase scatter symbol frequency for free spin eligibility');
        }
        if (totalFreeSpinsPlayed === 0 && boards3PlusScatters > 0) {
            console.log('🔧 HIGH: Fix free spin trigger system - eligible boards not triggering');
        }
        if (Math.abs(calculatedRTP - targetRTP) > 0.05) {
            console.log('🔧 MEDIUM: Adjust RTP balancing algorithm for better accuracy');
        }
        
        console.log('');
        console.log('✅ Chain verification complete!');
    }

    /**
     * Test multiple chain files for comparison
     */
    async compareChains(filenames: string[]): Promise<void> {
        console.log('🔄 CHAIN COMPARISON TEST');
        console.log('========================');
        console.log('');
        
        for (const filename of filenames) {
            await this.analyzeChain(filename);
            console.log(''.padEnd(50, '='));
            console.log('');
        }
    }
}

// CLI Usage
async function main() {
    const test = new ChainVerificationTest();
    
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node chain-verification-test.js <filename1> [filename2] ...');
        console.log('Example: node chain-verification-test.js wave-100boards-1757046759637.json');
        return;
    }
    
    if (args.length === 1) {
        await test.analyzeChain(args[0]);
    } else {
        await test.compareChains(args);
    }
}

// Run if called directly (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isMainModule = process.argv[1] === __filename || process.argv[1] === __filename.replace(/\.ts$/, '.js');

if (isMainModule) {
    main().catch(console.error);
}

export { ChainVerificationTest };
