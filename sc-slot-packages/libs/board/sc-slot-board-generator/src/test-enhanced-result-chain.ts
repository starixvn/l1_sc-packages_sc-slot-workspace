import { EnhancedResultChainGenerator } from "./result-chain/enhanced-result-chain-generator";
import { Difficulty } from "./difficulties";

/**
 * Test script for the Enhanced Result Chain Generator
 * Run this to validate the implementation with a small batch
 */
async function testEnhancedResultChain() {
    console.log("🚀 Testing Enhanced Result Chain Generator...\n");

    // Create generator with default settings
    const generator = new EnhancedResultChainGenerator(
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

    try {
        // Test with small batch (15 rounds)
        console.log("📊 Generating small test batch (15 rounds)...");
        const startTime = Date.now();
        
        const enhancedChain = await generator.generateSmallTestBatch(15);
        
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log("✅ Generation completed successfully!\n");

        // Display results
        console.log("📈 Chain Statistics:");
        console.log(`- Boards Generated: ${enhancedChain.boards.length}`);
        console.log(`- Generation Time: ${duration}ms`);
        console.log(`- Final RTP: ${(enhancedChain.rtpResult.actualRTP * 100).toFixed(2)}%`);
        console.log(`- Target RTP: ${(enhancedChain.config.targetRTP * 100).toFixed(2)}%`);
        console.log(`- Meets Target: ${enhancedChain.rtpResult.meetsTarget ? '✅' : '❌'}`);
        console.log(`- Hit Frequency: ${(enhancedChain.rtpResult.hitFrequency * 100).toFixed(1)}%`);

        console.log("\n🎯 Tumble Statistics:");
        console.log(`- Total Tumbles: ${enhancedChain.tumbleStats.totalTumbles}`);
        console.log(`- Average Tumbles per Round: ${enhancedChain.tumbleStats.averageTumblesPerRound.toFixed(2)}`);
        console.log(`- Max Tumbles in Round: ${enhancedChain.tumbleStats.maxTumblesInRound}`);

        console.log("\n🎰 Symbol Distribution:");
        Object.entries(enhancedChain.tumbleStats.symbolDistribution)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .forEach(([symbol, count]) => {
                console.log(`- Symbol ${symbol}: ${count} occurrences`);
            });

        console.log("\n🔍 Sample Board Analysis:");
        // Show details for first few boards
        enhancedChain.boards.slice(0, 3).forEach((board, index) => {
            console.log(`\nBoard ${index + 1}:`);
            console.log(`- Board: [${board.board.slice(0, 6).join(', ')}...] (showing first row)`);
            console.log(`- Total Win: ${board.totalCascadeWin.toFixed(2)}`);
            console.log(`- Cascade Count: ${board.cascadeCount}`);
            console.log(`- Tumble Count: ${board.settlementResult?.tumbles.length || 0}`);
            
            if (board.settlementResult?.tumbles.length > 0) {
                console.log(`- Tumble Wins: [${board.settlementResult.tumbles.map(t => t.win.toFixed(2)).join(', ')}]`);
            }

            if (board.settlementResult?.freeSpins.odds > 0) {
                console.log(`- Free Spins Won: ${board.settlementResult.freeSpins.odds}`);
            }
        });

        // Save results to file for inspection
        const jsonOutput = generator.exportEnhancedChainToJSON(enhancedChain);
        
        console.log("\n💾 Results exported to enhanced-chain-test-results.json");
        
        // Display some validation metrics
        console.log("\n✨ Validation Metrics:");
        const totalTumbleWin = enhancedChain.boards.reduce((sum, board) => sum + (board.totalTumbleWin || 0), 0);
        const totalCascadeWin = enhancedChain.boards.reduce((sum, board) => sum + board.totalCascadeWin, 0);
        
        console.log(`- Total Tumble Win: ${totalTumbleWin.toFixed(2)}`);
        console.log(`- Total Cascade Win: ${totalCascadeWin.toFixed(2)}`);
        console.log(`- Win Correlation: ${totalTumbleWin > 0 ? (totalCascadeWin / totalTumbleWin).toFixed(3) : 'N/A'}`);

        return { enhancedChain, jsonOutput, duration };

    } catch (error) {
        console.error("❌ Error during testing:", error);
        throw error;
    }
}

/**
 * Run the test and handle results
 */
if (require.main === module) {
    testEnhancedResultChain()
        .then(({ enhancedChain, jsonOutput, duration }) => {
            console.log(`\n🎉 Test completed successfully in ${duration}ms`);
            console.log(`📊 Generated ${enhancedChain.boards.length} boards with detailed tumble tracking`);
            
            // Write results to file
            const fs = require('fs');
            fs.writeFileSync('enhanced-chain-test-results.json', jsonOutput);
            
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n💥 Test failed:", error);
            process.exit(1);
        });
}

export { testEnhancedResultChain };
