# 🎭 Emotional Pattern Testing Suite

This testing suite generates board chains using the 5 core emotional patterns, saves detailed results for verification, and calculates comprehensive RTP metrics.

## 🚀 Quick Start

### Run Pattern Tests
```bash
# Full comprehensive test (100 rounds per pattern)
npm run test-patterns

# Simple demo test (20 rounds, 2 patterns)
npm run test-patterns-simple
```

### Output Files
All results are saved to `./pattern-test-results/`:
- `pattern-test-summary.json` - Overall test results and statistics  
- `pattern-[name]-detailed.json` - Individual pattern metrics
- `pattern-[name]-chain.json` - Raw board chain data

## 🎯 What Gets Tested

### 5 Emotional Patterns
1. **🔄 Comeback Loop** - Recovery from losses (Loss-averse players)
2. **🎬 Cliffhanger Loop** - Suspense before big wins (Risk-seekers) 
3. **🔍 Discovery Loop** - Reward exploration (Explorer players)
4. **😏 Tease Loop** - Near-miss payoff cycles (Universal appeal)
5. **🌊 Wave Loop** - Rhythmic win progression (Balanced players)

### Metrics Calculated
- **RTP Accuracy** - How close actual RTP matches target (85%)
- **Feature Trigger Rates** - Free spins, additional spins, tumble cascades
- **Win Distribution** - Big wins, medium wins, small wins, losses  
- **Emotional Profile** - Tension peaks, relief moments, excitement spikes
- **Engagement Score** - Overall player retention potential (0-100)
- **Pattern Completion** - How well patterns execute their sequences

### Real Feature Integration ✅
Tests only use **actual features** from your slot system:
- `free-spins` - Standard free spin bonus (settlementResult.freeSpins.odds)
- `additional-free-spins` - Retriggered spins (settlementResult.additionalFreeSpins.odds)  
- `tumble-cascade` - Enhanced tumbling (settlementResult.tumbles[].multipliers)

## 📊 Sample Output

```
🎭 Starting Emotional Pattern Testing...

Configuration:
- Chain Length: 100 rounds
- Bet Size: $1.0
- Target RTP: 85.0%
- Output Directory: ./pattern-test-results

🎯 Testing Pattern: COMEBACK
   ✅ RTP: 84.32% (Target: 85.0%)
   🎰 Features Triggered: 12
   📊 Engagement Score: 73.50
   ⏱️  Execution Time: 1847ms

🎯 Testing Pattern: CLIFFHANGER  
   ✅ RTP: 86.18% (Target: 85.0%)
   🎰 Features Triggered: 15
   📊 Engagement Score: 81.20
   ⏱️  Execution Time: 1923ms

📊 PATTERN TEST SUMMARY
==================================================
Average RTP: 84.89%
RTP Std Dev: 1.23%
Best RTP Pattern: discovery
Most Engaging: cliffhanger
Total Execution: 9234ms

🎯 RECOMMENDATIONS:
- All patterns are performing well within acceptable parameters.
==================================================
```

## ⚙️ Configuration

### Quick Configuration Presets
See `pattern-test-config.json` for preset configurations:
- `quick` - 50 rounds (development)
- `standard` - 100 rounds (validation)  
- `comprehensive` - 500 rounds (production prep)
- `production` - 1000 rounds (final validation)

### Custom Configuration
Edit the `TEST_CONFIG` object in `test-emotional-patterns.ts`:

```typescript
const TEST_CONFIG = {
    chainLength: 100,           // Rounds per pattern test
    betSize: 1.0,              // Standard bet size  
    targetRTP: 0.85,           // Expected RTP target
    saveDetailedResults: true,  // Save full chain data
    outputDir: './pattern-test-results'
};
```

## 🎮 Pattern Details

### Comeback Loop 🔄
- **Structure**: Loss streak → Near-miss → Medium win → Small win → Neutral
- **Target Players**: Loss-averse, need reassurance
- **Key Metrics**: Relief moments, recovery rate
- **Ideal RTP Variance**: ±3%

### Cliffhanger Loop 🎬  
- **Structure**: Small win → Small win → Near-miss → Loss streak → Big win
- **Target Players**: Risk-seekers, dramatic swings
- **Key Metrics**: Tension buildup, big win timing
- **Ideal RTP Variance**: ±4%

### Discovery Loop 🔍
- **Structure**: Neutral → Small win → Small win → Feature trigger → Moderate payout
- **Target Players**: Explorers, feature hunters
- **Key Metrics**: Feature trigger rate, exploration satisfaction
- **Ideal RTP Variance**: ±2%

### Tease Loop 😏
- **Structure**: Multiple near-misses → Neutral spins → Medium win  
- **Target Players**: Universal, streak hunters
- **Key Metrics**: Near-miss frequency, payoff timing
- **Ideal RTP Variance**: ±3%

### Wave Loop 🌊
- **Structure**: Small → Neutral → Medium → Neutral → Small → Big win
- **Target Players**: Mixed volatility preference  
- **Key Metrics**: Rhythm consistency, climax intensity
- **Ideal RTP Variance**: ±2%

## 🔬 Validation Criteria

### RTP Accuracy
- ✅ **Excellent**: ±1% from target
- ✅ **Good**: ±3% from target  
- ⚠️ **Acceptable**: ±5% from target
- ❌ **Poor**: >±5% from target

### Engagement Score
- ✅ **Excellent**: 80-100 points
- ✅ **Good**: 60-79 points
- ⚠️ **Acceptable**: 40-59 points  
- ❌ **Poor**: <40 points

### Feature Trigger Balance
- ✅ **Optimal**: 10-18% trigger rate
- ⚠️ **Acceptable**: 8-20% trigger rate
- ❌ **Needs Adjustment**: <8% or >20%

## 🛠️ Troubleshooting

### Common Issues

**Module Import Errors**
```bash
# Ensure you're in the correct directory
cd sc-slot-packages/libs/board/sc-slot-board-statistic

# Check dependencies are installed
npm install
```

**TypeScript Compilation Errors**
```bash
# Use the TypeScript version directly
npm run test-patterns
```

**Settlement Calculator Not Found**
- Ensure `sc-cascading-slot-base` dependency is installed
- Check version compatibility in package.json

**Low RTP Accuracy**
- Increase `chainLength` for more stable results
- Check if patterns are interfering with each other
- Validate target RTP is achievable with current game mechanics

**Low Engagement Scores**
- Review pattern phase durations
- Check if emotional transitions are too abrupt
- Validate feature trigger timing within patterns

## 📈 Interpreting Results

### RTP Analysis
- **Consistent RTP** across patterns = Good balance
- **High variance** = Patterns may need RTP parameter adjustment
- **All patterns under target** = Base RTP calculation may need review

### Engagement Analysis  
- **High engagement + Good RTP** = Optimal pattern
- **High engagement + Poor RTP** = Needs RTP tuning
- **Low engagement + Good RTP** = Needs more emotional variety

### Feature Analysis
- **Balanced trigger rates** = Good feature integration  
- **Extreme rates** = May need probability adjustment
- **Pattern-specific clustering** = Good targeting

## 🔄 Integration Workflow

1. **Development Testing**: Use `quick` preset (50 rounds)
2. **Feature Validation**: Use `standard` preset (100 rounds)
3. **Pre-Production**: Use `comprehensive` preset (500 rounds) 
4. **Final Validation**: Use `production` preset (1000 rounds)
5. **A/B Testing**: Compare different pattern configurations
6. **Production Monitoring**: Regular pattern effectiveness tracking

---

**Last Updated**: December 2024  
**Version**: v1.0  
**Status**: ✅ Ready for Testing
