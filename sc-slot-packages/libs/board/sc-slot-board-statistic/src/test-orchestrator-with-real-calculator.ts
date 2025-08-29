// Test the orchestrator with real external calculator using ts-node
import { BoardGeneratorAdapter } from "./cascading-slot/board-generator-adapter.js";
import { ResultChainOrchestrator } from "./cascading-slot/result-chain-orchestrator.js";
import { Difficulty } from "sc-slot-board-generator";

async function testOrchestratorWithRealCalculator() {
    console.log("🧪 Testing orchestrator with real external calculator...");
    
    try {
        // Create orchestrator with the same settings as statistic-runner uses
        const rtpConfig = {
            targetRTP: 0.47, // 47% RTP like in the report
            tolerance: 0.05, // 5% tolerance
            boardCount: 5, // Small batch
            betSize: 1.0, // 1 coin per round
            playerBudget: 100, // Total budget
        };

        const boardGeneratorFactory = () => new BoardGeneratorAdapter(
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

        const orchestrator = new ResultChainOrchestrator(boardGeneratorFactory, rtpConfig);
        
        console.log("🔄 Generating small result chain...");
        
        const resultChain = await orchestrator.generateResultChain({
            boardCount: 5, // Small batch
            targetRTP: 0.47, // 47% like in existing report
            betSize: 1.0,
            playerBudget: 100,
            difficulty: Difficulty.Easy,
            maxRetries: 10,
            tolerance: 0.1, // 10% tolerance for small batch
        });
        
        console.log("✅ Orchestrator with real calculator works!");
        console.log("📊 Result Chain:");
        console.log(`- Rounds generated: ${resultChain.boards.length}`);
        console.log(`- RTP info: ${resultChain.rtpResult ? "✅ Available" : "❌ Missing"}`);
        console.log(`- Settlement results in first round:`, resultChain.boards[0]?.settlementResult ? "✅ Available" : "❌ Missing");
        
        if (resultChain.boards[0]?.settlementResult) {
            const settlement = resultChain.boards[0].settlementResult;
            console.log(`- First round tumbles: ${settlement.tumbles?.length || 0}`);
            console.log(`- First round free spins: ${settlement.freeSpins?.odds || 0}`);
        }
        
        return true;
    } catch (error) {
        console.error("❌ Orchestrator test failed:", error.message);
        console.error("Stack:", error.stack);
        return false;
    }
}

testOrchestratorWithRealCalculator()
    .then(success => {
        if (success) {
            console.log("\n✅ Real settlement integration successful!");
        } else {
            console.log("\n❌ Real settlement integration failed.");
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("💥 Unexpected error:", error);
        process.exit(1);
    });
