// Feature Triggers Example
// Demonstrates how feature triggers work with emotional engagement patterns

import { 
    FeatureTriggerSystem, 
    DEFAULT_FEATURE_CONFIG,
    FeatureType,
    FeatureResult
} from "./cascading-slot/feature-trigger-system.js";

/**
 * Example 1: Basic Feature Triggering
 */
function exampleBasicFeatureTriggers() {
    console.log("🎰 Example 1: Basic Feature Triggers");
    console.log("=====================================");
    
    const featureSystem = new FeatureTriggerSystem(DEFAULT_FEATURE_CONFIG);
    
    // Simulate different board scenarios
    const scenarios = [
        {
            name: "Scatter Heavy Board",
            board: [1, 9, 3, 9, 5, 6, 9, 8, 2, 4, 1, 7, 3, 9, 6], // 4 scatters
            symbols: { 1: 2, 2: 1, 3: 2, 4: 1, 5: 1, 6: 2, 7: 1, 8: 1, 9: 4 },
            baseWin: 15
        },
        {
            name: "Wild Heavy Board", 
            board: [1, 10, 3, 10, 5, 6, 10, 8, 2, 4, 10, 7, 3, 5, 6], // 4 wilds
            symbols: { 1: 1, 2: 1, 3: 2, 4: 1, 5: 2, 6: 2, 7: 1, 8: 1, 10: 4 },
            baseWin: 22
        },
        {
            name: "Big Win Board",
            board: [7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 4, 4, 3, 3, 2], // Lots of high symbols
            symbols: { 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 3 },
            baseWin: 45
        }
    ];
    
    scenarios.forEach((scenario) => {
        console.log(`\n🎲 Scenario: ${scenario.name}`);
        console.log(`Board: [${scenario.board.join(', ')}]`);
        console.log(`Base Win: ${scenario.baseWin}`);
        
        const features = featureSystem.evaluateFeatureTriggers(
            scenario.board,
            scenario.symbols,
            false, // Not pattern-requested
            scenario.baseWin
        );
        
        if (features.length > 0) {
            features.forEach(feature => {
                console.log(`✨ ${feature.description}`);
                console.log(`   💰 Total Win: ${feature.totalWin.toFixed(2)} (${feature.multiplier.toFixed(1)}x multiplier)`);
                console.log(`   🎭 Emotional Impact: ${feature.emotionalImpact}`);
                if (feature.freeSpinsAwarded > 0) {
                    console.log(`   🎰 Free Spins: ${feature.freeSpinsAwarded}`);
                }
            });
        } else {
            console.log("❌ No features triggered");
        }
    });
}

/**
 * Example 2: Pattern-Requested Feature Triggers  
 */
function examplePatternRequestedFeatures() {
    console.log("\n🎭 Example 2: Pattern-Requested Feature Triggers");
    console.log("=================================================");
    
    const featureSystem = new FeatureTriggerSystem({
        ...DEFAULT_FEATURE_CONFIG,
        patternBoostMultiplier: 5.0 // Very high boost for demonstration
    });
    
    // Discovery pattern requesting feature trigger
    const discoveryBoard = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6];
    const discoverySymbols = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 1, 8: 1, 9: 1 };
    
    console.log("\n🔍 Discovery Pattern Phase: Feature-Trigger Requested");
    console.log("Board: Mixed symbols, base win: 12");
    
    const patternFeatures = featureSystem.evaluateFeatureTriggers(
        discoveryBoard,
        discoverySymbols,
        true, // Pattern is requesting feature
        12
    );
    
    if (patternFeatures.length > 0) {
        console.log("🎉 Pattern successfully triggered features:");
        patternFeatures.forEach(feature => {
            console.log(`  ✨ ${feature.description}`);
            console.log(`     💰 Total Win: ${feature.totalWin.toFixed(2)}`);
            console.log(`     🎭 Impact: ${feature.emotionalImpact}`);
        });
    } else {
        console.log("❌ Pattern failed to trigger features (rare with high boost)");
    }
}

/**
 * Example 3: Feature Types Showcase
 */
function exampleAllFeatureTypes() {
    console.log("\n🎪 Example 3: All Feature Types Showcase");
    console.log("=========================================");
    
    const featureSystem = new FeatureTriggerSystem(DEFAULT_FEATURE_CONFIG);
    const baseWin = 25;
    
    // Force trigger each feature type for demonstration
    const featureTypes: FeatureType[] = [
        'free-spins',
        'pick-bonus', 
        'cascading-boost',
        'multiplier-wild',
        'mystery-box',
        'progressive-mini',
        'symbol-upgrade',
        'expanding-wilds',
        'scatter-explosion'
    ];
    
    featureTypes.forEach(featureType => {
        const result = featureSystem.forceTriggerFeature(featureType, baseWin);
        console.log(`\n🎯 ${featureType.toUpperCase()}:`);
        console.log(`   ${result.description}`);
        console.log(`   💰 Win: ${baseWin} → ${result.totalWin.toFixed(2)} (+${result.featureWin.toFixed(2)})`);
        console.log(`   📈 Multiplier: ${result.multiplier.toFixed(1)}x`);
        console.log(`   🎭 Impact: ${result.emotionalImpact}`);
        if (result.freeSpinsAwarded > 0) {
            console.log(`   🆓 Free Spins: ${result.freeSpinsAwarded}`);
        }
    });
}

/**
 * Example 4: Feature Integration with Emotional Patterns
 */
function examplePatternFeatureIntegration() {
    console.log("\n🎭 Example 4: Pattern-Feature Integration");
    console.log("==========================================");
    
    const featureSystem = new FeatureTriggerSystem(DEFAULT_FEATURE_CONFIG);
    
    // Simulate Discovery Loop pattern progression
    const discoveryPhases = [
        { phase: "Neutral spins", hasFeature: false, baseWin: 0 },
        { phase: "Small win", hasFeature: false, baseWin: 6 },
        { phase: "Small win", hasFeature: false, baseWin: 9 },
        { phase: "Feature trigger!", hasFeature: true, baseWin: 18 },
        { phase: "Moderate payout", hasFeature: false, baseWin: 42 }
    ];
    
    console.log("🔍 Discovery Loop Pattern Simulation:");
    console.log("Structure: Neutral → Small win → Small win → Feature trigger → Moderate payout");
    
    let totalSessionWin = 0;
    
    discoveryPhases.forEach((phase, index) => {
        console.log(`\nSpin ${index + 1}: ${phase.phase}`);
        
        if (phase.hasFeature) {
            // Discovery pattern requests feature
            const board = [1, 2, 3, 9, 5, 6, 7, 8, 9, 1, 10, 3, 4, 9, 6]; // Good feature-trigger board
            const symbols = { 1: 2, 2: 1, 3: 2, 4: 1, 5: 1, 6: 2, 7: 1, 8: 1, 9: 3, 10: 1 };
            
            const features = featureSystem.evaluateFeatureTriggers(
                board, 
                symbols, 
                true, // Pattern requests feature
                phase.baseWin
            );
            
            if (features.length > 0) {
                const bestFeature = features.reduce((best, current) => 
                    current.totalWin > best.totalWin ? current : best
                );
                console.log(`   ✨ ${bestFeature.description}`);
                console.log(`   💰 Win: ${phase.baseWin} → ${bestFeature.totalWin.toFixed(2)}`);
                console.log(`   😊 Emotional State: Reward → Satisfaction`);
                totalSessionWin += bestFeature.totalWin;
            } else {
                console.log(`   💰 Base Win: ${phase.baseWin}`);
                totalSessionWin += phase.baseWin;
            }
        } else {
            console.log(`   💰 Base Win: ${phase.baseWin}`);
            totalSessionWin += phase.baseWin;
        }
    });
    
    console.log(`\n🏁 Discovery Loop Completed!`);
    console.log(`📊 Total Session Win: ${totalSessionWin.toFixed(2)}`);
    console.log(`🎭 Emotional Journey: Curiosity → Anticipation → Reward → Satisfaction`);
}

/**
 * Example 5: Feature Cooldowns and Active States
 */
function exampleFeatureStates() {
    console.log("\n⏱️ Example 5: Feature States and Cooldowns");
    console.log("===========================================");
    
    const featureSystem = new FeatureTriggerSystem(DEFAULT_FEATURE_CONFIG);
    
    // Force trigger a free spins feature
    const freeSpinsResult = featureSystem.forceTriggerFeature('free-spins', 20);
    console.log(`🎰 Triggered: ${freeSpinsResult.description}`);
    
    console.log("\n📊 Active Feature Status:");
    console.log(featureSystem.getActiveFeatureStatus());
    console.log(`Has Active Features: ${featureSystem.hasActiveFeatures()}`);
    
    // Simulate several spins to show countdown
    console.log("\n⏳ Simulating spins with active free spins:");
    for (let spin = 1; spin <= 8; spin++) {
        featureSystem.updateActiveFeatures();
        const activeFeatures = featureSystem.getActiveFeatureStatus();
        const remainingSpins = activeFeatures['free-spins'] || 0;
        
        console.log(`Spin ${spin}: ${remainingSpins > 0 ? `${remainingSpins} free spins remaining` : 'Free spins ended'}`);
        
        if (remainingSpins === 0) break;
    }
}

/**
 * Run all feature trigger examples
 */
export async function runFeatureTriggerExamples() {
    console.log("🎯 Feature Trigger System Examples");
    console.log("==================================\n");
    
    exampleBasicFeatureTriggers();
    examplePatternRequestedFeatures();
    exampleAllFeatureTypes();
    examplePatternFeatureIntegration();
    exampleFeatureStates();
    
    console.log("\n✨ All feature trigger examples completed!");
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runFeatureTriggerExamples().catch(console.error);
}
