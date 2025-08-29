// Test if the existing statistic-runner works
import { spinABatch } from "./cascading-slot/statistic-runner.js";

async function testExistingStatisticRunner() {
    console.log("🧪 Testing existing statistic-runner...");
    
    try {
        const batchOptions = {
            numberOfRounds: 5,
            coinValue: 0.1,
            betLevel: 5,
            debug: true,
            multiplierSettings: {
                min: 2,
                max: 21,
            },
            modeSettings: {
                mode: {
                    1: { // Easy difficulty
                        0: 158, 1: 132, 2: 119, 3: 99, 4: 79,
                        5: 66, 6: 53, 7: 42, 8: 21, 9: 14, 10: 3,
                    }
                }
            },
            difficulty: 1, // Easy
        };

        console.log("🔄 Running existing statistic runner...");
        const { rounds, statistic } = spinABatch(batchOptions);
        
        console.log("✅ Existing statistic runner works!");
        console.log("📊 Results:");
        console.log(`- Rounds processed: ${rounds.length}`);
        console.log(`- Total RTP: ${(statistic.rtp * 100).toFixed(2)}%`);
        console.log(`- Total tumbles: ${statistic.totalMultipliers}`);
        console.log(`- First round settlement result:`, rounds[0]?.settlementResult ? "✅ Available" : "❌ Missing");
        
        return true;
    } catch (error) {
        console.error("❌ Existing statistic runner failed:", error.message);
        console.error("Stack:", error.stack);
        return false;
    }
}

testExistingStatisticRunner()
    .then(success => {
        if (success) {
            console.log("\n✅ Existing system works! We can proceed with integration.");
        } else {
            console.log("\n❌ Existing system has issues. Need to investigate.");
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("💥 Unexpected error:", error);
        process.exit(1);
    });
