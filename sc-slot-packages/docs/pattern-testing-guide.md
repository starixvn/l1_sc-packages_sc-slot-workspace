# 🎭 Pattern Testing Guide

Complete guide for generating slot boards using emotional engagement patterns with real settlement calculations.

## 🚀 Quick Start

### Available Scripts

```bash
# Basic test (20 boards, fixed configuration)
npm run test-simple

# Configurable pattern test (default: 50 boards, comeback pattern)
npm run test-pattern

# Custom configuration examples
npm run test-pattern -- 100              # 100 boards, comeback pattern
npm run test-pattern -- 75 cliffhanger   # 75 boards, cliffhanger pattern
npm run test-pattern -- 200 discovery    # 200 boards, discovery pattern

# Show help
npm run test-pattern -- --help
```

## 🎯 Available Patterns

| Pattern | Description | Risk Profile | Best For |
|---------|-------------|--------------|----------|
| **comeback** | Recovery-focused pattern for loss-averse players | loss-averse | Players who need reassurance after losses |
| **cliffhanger** | Suspense-building pattern for thrill-seekers | risk-seeker | Players who enjoy dramatic tension |
| **discovery** | Exploration pattern for curious players | explorer | Players who like finding new features |
| **tease** | Near-miss pattern for anticipation-driven players | streak-hunter | Players motivated by "almost wins" |
| **wave** | Rhythmic pattern for balanced gameplay | mixed | Players who prefer consistent variation |

## 📊 Script Details

### `npm run test-simple`

**Purpose**: Quick validation test  
**Configuration**: Fixed 20 boards, basic RTP targeting  
**Output**: Console + JSON file

```bash
npm run test-simple
```

**Sample Output**:
```
🎭 Simple Board Chain Test
===========================
🔄 Initializing basic orchestrator...
✅ External RoundCalculator initialized successfully
🎯 Generating basic result chain...
✅ Target RTP achieved on attempt 1!

✅ Test Results:
Rounds Generated: 20
Total Wagered: $20.00
Total Won: $16.90
Actual RTP: 84.50%
Target RTP: 85.0%
RTP Variance: 0.50%
Boards with Features: 20 (100.0%)

💾 Results saved to: pattern-test-results/simple-test-results.json
```

### `npm run test-pattern`

**Purpose**: Configurable pattern testing with detailed analysis  
**Configuration**: Customizable board count and pattern type  
**Output**: Detailed console report + JSON file

**Syntax**:
```bash
npm run test-pattern -- [totalBoards] [patternType]
```

**Parameters**:
- `totalBoards`: Number of boards to generate (default: 50)
- `patternType`: Pattern name (default: comeback)

**Sample Output**:
```
🎭 Standard Pattern Test
========================
Pattern: Cliffhanger Loop
Description: Suspense-building pattern for thrill-seekers
Total Boards: 30
Risk Profile: risk-seeker

✅ Pattern Test Results:
========================
Pattern: Cliffhanger Loop
Boards Generated: 30
Total Wagered: $30.00
Total Won: $24.80
Actual RTP: 82.67%
RTP Variance: 2.33%

🎰 Feature Statistics:
Boards with Features: 30 (100.0%)
Total Cascades: 53
Total Free Spins Won: 18

💰 Win Distribution:
Losses (0x): 14 (46.7%)
Small Wins (<1x): 8 (26.7%)
Medium Wins (1-5x): 8 (26.7%)
Big Wins (>5x): 0 (0.0%)

📊 Sample Results (first 10 rounds):
Round  1: Win $0.00 (0.0x) [LOSS] [Cascades: 1, Multiplier: 14x]
Round  2: Win $0.00 (0.0x) [LOSS] [Cascades: 1]
Round  3: Win $0.50 (0.5x) [Small] [Cascades: 2]

💾 Results saved to: pattern-test-results/standard-test-cliffhanger-30boards.json
✅ Cliffhanger Loop pattern test completed successfully!
```

## 📁 Output Files

All test results are saved to `./pattern-test-results/`:

### File Naming Convention
- **Simple Test**: `simple-test-results.json`
- **Pattern Test**: `standard-test-{pattern}-{boards}boards.json`

### JSON Structure
```json
{
  "config": {
    "totalBoards": 30,
    "patternType": "cliffhanger",
    "betSize": 1.0,
    "targetRTP": 0.85
  },
  "pattern": {
    "name": "Cliffhanger Loop",
    "description": "Suspense-building pattern for thrill-seekers",
    "riskProfile": "risk-seeker"
  },
  "results": {
    "boardsGenerated": 30,
    "totalWagered": 30.0,
    "totalWon": 24.8,
    "actualRTP": 0.8267,
    "rtpVariance": 0.0233,
    "executionTime": 3293,
    "featuresTriggered": 30,
    "cascadeCount": 53,
    "freeSpinsWon": 18,
    "winDistribution": {
      "losses": 14,
      "smallWins": 8,
      "mediumWins": 8,
      "bigWins": 0
    }
  },
  "sampleBoards": [...],
  "timestamp": "2024-12-04T18:05:32.123Z"
}
```

## 🎮 Pattern Characteristics

### Comeback Loop 🔄
- **Target**: Loss-averse players who need reassurance
- **Structure**: Recovery-focused with gradual improvement
- **Key Metrics**: Relief moments, recovery rate
- **Recommended Sample**: 50+ boards

### Cliffhanger Loop 🎬  
- **Target**: Risk-seekers who enjoy dramatic tension
- **Structure**: Builds suspense before resolution
- **Key Metrics**: Tension buildup, dramatic payoffs
- **Recommended Sample**: 75+ boards

### Discovery Loop 🔍
- **Target**: Explorers who like finding features
- **Structure**: Rewards exploration and learning
- **Key Metrics**: Feature discovery rate, satisfaction
- **Recommended Sample**: 100+ boards

### Tease Loop 😏
- **Target**: Players motivated by near-misses
- **Structure**: Near-miss sequences with eventual payoff
- **Key Metrics**: Near-miss frequency, payoff timing
- **Recommended Sample**: 75+ boards

### Wave Loop 🌊
- **Target**: Balanced players who prefer rhythm
- **Structure**: Rhythmic alternation of wins/losses
- **Key Metrics**: Rhythm consistency, balance
- **Recommended Sample**: 100+ boards

## 📈 Interpreting Results

### RTP Analysis
- **✅ Excellent**: ±2% from target (85%)
- **✅ Good**: ±5% from target
- **⚠️ Acceptable**: ±10% from target
- **❌ Needs Review**: >±10% from target

### Feature Trigger Rates
- **✅ Optimal**: 80-100% of boards with features
- **⚠️ Low**: <60% feature rate
- **⚠️ High**: >90% may be overstimulating

### Win Distribution Balance
- **Losses**: 30-50% (creates tension)
- **Small Wins**: 25-35% (maintains engagement)  
- **Medium Wins**: 15-25% (provides satisfaction)
- **Big Wins**: 2-8% (creates excitement)

## 🔧 Troubleshooting

### Common Issues

**Script Not Found**
```bash
# Ensure you're in the correct directory
cd sc-slot-packages/libs/board/sc-slot-board-statistic

# Check available scripts
npm run
```

**External Calculator Errors**
- Dependency `sc-cascading-slot-base` version 2.0.0 is required
- Check that `sc-slot-board-generator` is version 1.2.0-beta.1+

**Low RTP Accuracy**
- Increase board count for more stable results
- Small samples (< 50 boards) have high variance
- Check settlement calculator integration

**No Features Triggering**
- Verify `sc-cascading-slot-base` is properly installed
- Check that settlement results contain tumbles/freeSpins data

### Validation Commands
```bash
# Test basic functionality
npm run test-simple

# Test pattern functionality  
npm run test-pattern -- 10 comeback

# Check dependencies
npm list sc-cascading-slot-base sc-slot-board-generator
```

## 🔄 Development Workflow

### 1. Quick Validation (Development)
```bash
npm run test-simple
```
**Use for**: Code changes, quick functionality check

### 2. Pattern Testing (Feature Testing)
```bash
npm run test-pattern -- 50 [pattern]
```
**Use for**: Validating specific patterns, balanced testing

### 3. Comprehensive Testing (Pre-Production)
```bash
npm run test-pattern -- 200 comeback
npm run test-pattern -- 200 cliffhanger
npm run test-pattern -- 200 discovery
```
**Use for**: Stability testing, RTP validation

### 4. Production Validation
```bash
npm run test-pattern -- 500 [each-pattern]
```
**Use for**: Final validation, regulatory compliance

## 📝 Best Practices

### Sample Size Guidelines
- **Development**: 10-20 boards (quick feedback)
- **Testing**: 50-100 boards (pattern validation)
- **Validation**: 200+ boards (RTP accuracy)
- **Production**: 500+ boards (compliance)

### Pattern Selection
- **New features**: Start with `wave` (balanced)
- **High-risk players**: Test `cliffhanger` and `tease`
- **Cautious players**: Focus on `comeback` and `discovery`
- **General audience**: Validate all patterns

### Result Interpretation
- Small samples have high RTP variance (expected)
- Focus on feature trigger rates and win distribution
- Look for consistent behavior across multiple runs
- Document edge cases and unexpected results

---

**Last Updated**: December 2024  
**Version**: v2.0  
**Status**: ✅ Production Ready
