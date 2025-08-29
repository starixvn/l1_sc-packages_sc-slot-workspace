import { ResultChainOrchestrator, ResultChainConfig } from "./cascading-slot/result-chain-orchestrator";
import { BoardGeneratorAdapter } from "./cascading-slot/board-generator-adapter";
import { Difficulty } from "sc-slot-board-generator";

/**
 * Test the new Result Chain Orchestrator architecture
 */
async function testResultChainOrchestrator() {
    console.log("🚀 Testing Result Chain Orchestrator...\n");

    // Create board generator factory
    const createBoardGenerator = () => new BoardGeneratorAdapter(
        {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3,
        },
        {
            min: 2,
            max: 21,
        },
        Difficulty.Easy
    );

    // Create orchestrator with RTP configuration
    const orchestrator = new ResultChainOrchestrator(createBoardGenerator, {
        targetRTP: 0.97,
        tolerance: 0.05, // ±5% tolerance
        boardCount: 15,
        betSize: 1,
        playerBudget: 100,
    });

    try {
        // Test with small batch
        console.log("📊 Generating result chain with RTP validation...");
        const startTime = Date.now();
        
        const resultChain = await orchestrator.generateSmallTestBatch(15);
        
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log("✅ Generation completed successfully!\n");

        // Display results
        console.log("📈 Chain Statistics:");
        console.log(`- Boards Generated: ${resultChain.boards.length}`);
        console.log(`- Generation Time: ${duration}ms`);
        console.log(`- Attempts Used: ${resultChain.generationStats.attempts}`);
        console.log(`- Final RTP: ${(resultChain.rtpResult.actualRTP * 100).toFixed(2)}%`);
        console.log(`- Target RTP: ${(resultChain.config.targetRTP * 100).toFixed(2)}%`);
        console.log(`- Meets Target: ${resultChain.rtpResult.meetsTarget ? '✅' : '❌'}`);
        console.log(`- Hit Frequency: ${(resultChain.rtpResult.hitFrequency * 100).toFixed(1)}%`);
        console.log(`- Variance: ${resultChain.rtpResult.variance.toFixed(3)}`);

        console.log("\n🎯 Tumble Statistics:");
        console.log(`- Total Tumbles: ${resultChain.tumbleStats.totalTumbles}`);
        console.log(`- Average Tumbles per Round: ${resultChain.tumbleStats.averageTumblesPerRound.toFixed(2)}`);
        console.log(`- Max Tumbles in Round: ${resultChain.tumbleStats.maxTumblesInRound}`);

        console.log("\n🎰 Symbol Distribution:");
        Object.entries(resultChain.tumbleStats.symbolDistribution)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .forEach(([symbol, count]) => {
                console.log(`- Symbol ${symbol}: ${count} occurrences`);
            });

        console.log("\n🔍 Sample Board Analysis:");
        // Show details for first few boards
        resultChain.boards.slice(0, 3).forEach((board, index) => {
            console.log(`\nBoard ${index + 1}:`);
            console.log(`- Board: [${board.board.slice(0, 6).join(', ')}...] (showing first row)`);
            console.log(`- Total Win: ${board.totalCascadeWin.toFixed(2)}`);
            console.log(`- Cascade Count: ${board.cascadeCount}`);
            console.log(`- Settlement Available: ${board.settlementResult ? '✅' : '❌'}`);
            
            if (board.settlementResult) {
                console.log(`- Tumbles: ${board.settlementResult.tumbles.length}`);
                if (board.settlementResult.tumbles.length > 0) {
                    const tumbleWins = board.settlementResult.tumbles.map(t => t.win.toFixed(2));
                    console.log(`- Tumble Wins: [${tumbleWins.join(', ')}]`);
                }
                if (board.settlementResult.freeSpins.odds > 0) {
                    console.log(`- Free Spins Won: ${board.settlementResult.freeSpins.odds}`);
                }
            }
        });

        // Test RTP validation logic
        console.log("\n🧮 RTP Validation:");
        console.log(`- Total Bets: ${resultChain.rtpResult.totalBets}`);
        console.log(`- Total Wins: ${resultChain.rtpResult.totalWins.toFixed(2)}`);
        console.log(`- Calculated RTP: ${(resultChain.rtpResult.totalWins / resultChain.rtpResult.totalBets * 100).toFixed(2)}%`);

        // Export results
        const jsonOutput = orchestrator.exportResultChainToJSON(resultChain);
        console.log("\n💾 Results exported to orchestrator-test-results.json");

        return { resultChain, jsonOutput, duration };

    } catch (error) {
        console.error("❌ Error during testing:", error);
        
        if (error.message.includes('sc-cascading-slot-base')) {
            console.log("\n💡 This error is expected - external calculator not available.");
            console.log("The orchestrator will use fallback logic for this test.");
            console.log("To use real settlement logic, add 'sc-cascading-slot-base' as dependency.");
        }
        
        throw error;
    }
}

/**
 * Test different configurations
 */
async function testDifferentConfigurations() {
    console.log("\n🔄 Testing different RTP configurations...");

    const createBoardGenerator = () => new BoardGeneratorAdapter(
        { reels: 6, symbolsOnReel: 5, numberOfSymbols: 11, numberOfShuffles: 3 },
        { min: 2, max: 21 },
        Difficulty.Easy
    );

    const configurations = [
        { targetRTP: 0.95, tolerance: 0.02, boardCount: 10 },
        { targetRTP: 0.97, tolerance: 0.01, boardCount: 10 },
        { targetRTP: 0.99, tolerance: 0.05, boardCount: 10 },
    ];

    for (const config of configurations) {
        console.log(`\n📊 Testing RTP ${(config.targetRTP * 100).toFixed(0)}% ± ${(config.tolerance * 100).toFixed(1)}%`);
        
        const orchestrator = new ResultChainOrchestrator(createBoardGenerator, {
            ...config,
            betSize: 1,
            playerBudget: 100,
        });

        try {
            const result = await orchestrator.generateResultChain({
                boardCount: config.boardCount,
                targetRTP: config.targetRTP,
                betSize: 1,
                playerBudget: 100,
                difficulty: Difficulty.Easy,
                maxRetries: 2,
                tolerance: config.tolerance,
            });

            console.log(`✅ Result: ${(result.rtpResult.actualRTP * 100).toFixed(2)}% RTP, ${result.generationStats.attempts} attempts`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
}

/**
 * Run all tests
 */
if (require.main === module) {
    testResultChainOrchestrator()
        .then(({ resultChain, jsonOutput, duration }) => {
            console.log(`\n🎉 Orchestrator test completed successfully in ${duration}ms`);
            console.log(`📊 Generated ${resultChain.boards.length} boards with RTP validation`);
            
            // Write results to file
            const fs = require('fs');
            fs.writeFileSync('orchestrator-test-results.json', jsonOutput);
            
            // Run configuration tests
            return testDifferentConfigurations();
        })
        .then(() => {
            console.log("\n🏁 All tests completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n💥 Test failed:", error);
            process.exit(1);
        });
}

export { testResultChainOrchestrator };

