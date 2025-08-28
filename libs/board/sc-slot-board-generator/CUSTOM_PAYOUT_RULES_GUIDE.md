# Custom Payout Rules Guide

## Overview

The Custom Payout Rules feature allows you to configure slot game mechanics through JSON files or programmatic configuration, making it easy to experiment with different game variants without modifying code.

## Table of Contents

- [Quick Start](#quick-start)
- [JSON Structure](#json-structure)
- [Usage Patterns](#usage-patterns)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Usage

```typescript
// 1. Use default rules (loads from src/payout-rules.json)
const calculator = new PayoutCalculator();

// 2. Use custom base multiplier
const highPayoutCalculator = new PayoutCalculator(2); // 2x all payouts

// 3. Load custom rules from file
const customCalculator = PayoutCalculator.createWithCustomRules("./my-rules.json");

// 4. Use programmatic rules
const customRules: PayoutRulesConfig = {
  /* ... */
};
const programmaticCalculator = new PayoutCalculator(1, customRules);
```

### File Structure

```
src/
├── payout-rules.json          # Default rules
└── payout-calculator.ts       # Calculator implementation

examples/
├── high-volatility-rules.json # Example high-volatility config
└── custom-payout-rules-example.ts
```

---

## JSON Structure

### Complete Configuration Schema

```typescript
interface PayoutRulesConfig {
  version: string; // Rule set version
  gameType: string; // Game name/description
  description: string; // Human-readable description
  symbolPayouts: SymbolPayoutConfig[]; // Regular symbol rules
  specialSymbols: {
    // Special symbol configuration
    zeus: ScatterPayoutConfig; // Scatter symbol (Zeus)
    multiplierOrb: MultiplierOrbConfig; // Multiplier orb settings
  };
  gameRules: {
    // Game mechanics
    minSymbolWinCount: number; // Minimum symbols for win
    description: string;
    winDetection: "count-based";
    cascading: boolean;
    freeSpins: {
      triggeredBy: string;
      retriggerRules: {
        count: number;
        additionalSpins: number;
        description: string;
      };
    };
  };
}
```

### Symbol Payout Configuration

```typescript
interface SymbolPayoutConfig {
  symbol: number; // Symbol ID (0-8)
  name: string; // Human-readable name
  type: "premium" | "high" | "medium" | "low"; // Symbol tier
  payouts: PayoutTier[]; // Payout tiers
}

interface PayoutTier {
  count: number; // Minimum symbol count
  multiplier: number; // Payout multiplier
  description?: string; // Optional description
  freeSpins?: number; // For scatter symbols
}
```

### Example Symbol Configuration

```json
{
  "symbol": 0,
  "name": "Crown",
  "type": "premium",
  "payouts": [
    { "count": 8, "multiplier": 10, "description": "8-9 symbols" },
    { "count": 10, "multiplier": 25, "description": "10-11 symbols" },
    { "count": 12, "multiplier": 50, "description": "12+ symbols" }
  ]
}
```

---

## Usage Patterns

### 1. Game Variants

Create different configurations for various game types:

```typescript
// High volatility - rare but massive wins
const highVolatility = PayoutCalculator.createWithCustomRules("./high-volatility-rules.json");

// Low volatility - frequent small wins
const lowVolatility = PayoutCalculator.createWithCustomRules("./low-volatility-rules.json");

// Balanced gameplay
const balanced = new PayoutCalculator(); // Uses default rules
```

### 2. A/B Testing

```typescript
// Test different RTP configurations
const rtpTest95 = PayoutCalculator.createWithCustomRules("./rtp-95-rules.json");
const rtpTest97 = PayoutCalculator.createWithCustomRules("./rtp-97-rules.json");

// Compare results
const testBoard = generateTestBoard();
const result95 = rtpTest95.calculatePayout(testBoard, [], 1);
const result97 = rtpTest97.calculatePayout(testBoard, [], 1);
```

### 3. Regional Customization

```typescript
// Different regions may require different RTP/volatility
const europeRules = PayoutCalculator.createWithCustomRules("./europe-rules.json");
const asiaRules = PayoutCalculator.createWithCustomRules("./asia-rules.json");
const americaRules = PayoutCalculator.createWithCustomRules("./america-rules.json");
```

### 4. Dynamic Rule Adjustment

```typescript
// Programmatically modify rules based on player data
function createPersonalizedRules(playerLevel: number): PayoutRulesConfig {
  const baseRules = new PayoutCalculator().getRulesConfig();

  // Increase payouts for higher level players
  const levelMultiplier = 1 + playerLevel * 0.1;

  return {
    ...baseRules,
    symbolPayouts: baseRules.symbolPayouts.map((symbol) => ({
      ...symbol,
      payouts: symbol.payouts.map((payout) => ({
        ...payout,
        multiplier: payout.multiplier * levelMultiplier,
      })),
    })),
  };
}
```

---

## Examples

### Example 1: High Volatility Configuration

```json
{
  "version": "1.1",
  "gameType": "High Volatility Zeus Slots",
  "description": "Rare but massive wins",
  "symbolPayouts": [
    {
      "symbol": 0,
      "name": "Crown",
      "type": "premium",
      "payouts": [
        { "count": 10, "multiplier": 100, "description": "10-11 symbols (ultra rare)" },
        { "count": 12, "multiplier": 500, "description": "12+ symbols (jackpot)" }
      ]
    }
  ],
  "gameRules": {
    "minSymbolWinCount": 10,
    "description": "Requires 10+ symbols for wins"
  }
}
```

### Example 2: Progressive Difficulty

```typescript
// Create rules that scale with player progression
function createProgressiveRules(stage: number): PayoutRulesConfig {
  const baseMultiplier = Math.pow(1.2, stage); // 20% increase per stage

  return {
    version: `progressive-${stage}`,
    gameType: `Stage ${stage} Zeus Slots`,
    description: `Progressive difficulty stage ${stage}`,
    symbolPayouts: [
      {
        symbol: 0,
        name: "Crown",
        type: "premium",
        payouts: [
          { count: 8, multiplier: 10 * baseMultiplier },
          { count: 10, multiplier: 25 * baseMultiplier },
          { count: 12, multiplier: 50 * baseMultiplier },
        ],
      },
      // ... other symbols
    ],
    // ... rest of configuration
  };
}
```

### Example 3: Seasonal Events

```typescript
// Halloween theme with spooky high payouts
const halloweenRules: PayoutRulesConfig = {
  version: "halloween-2024",
  gameType: "Spooky Zeus Halloween",
  description: "Halloween special with enhanced payouts",
  symbolPayouts: [
    {
      symbol: 0,
      name: "Haunted Crown",
      type: "premium",
      payouts: [
        { count: 8, multiplier: 13, description: "Unlucky 13x" },
        { count: 10, multiplier: 31, description: "Halloween 31x" },
        { count: 12, multiplier: 66, description: "Spooky 66x" },
      ],
    },
  ],
  specialSymbols: {
    zeus: {
      symbol: 9,
      name: "Spooky Zeus",
      type: "scatter",
      description: "Halloween scatter bonus",
      payouts: [
        { count: 4, multiplier: 6, freeSpins: 13 },
        { count: 5, multiplier: 13, freeSpins: 20 },
        { count: 6, multiplier: 131, freeSpins: 31 },
      ],
    },
  },
};
```

---

## Best Practices

### 1. Rule Design Guidelines

**RTP Balance:**

- Target RTP should typically be between 94-98%
- Higher volatility = lower frequency, higher payouts
- Lower volatility = higher frequency, smaller payouts

**Payout Scaling:**

- Use exponential scaling for higher symbol counts
- Maintain reasonable ratios between symbol tiers
- Premium symbols: 10-50x multipliers
- High symbols: 1-15x multipliers
- Medium symbols: 0.5-10x multipliers
- Low symbols: 0.1-5x multipliers

**Free Spin Configuration:**

- Standard trigger: 4+ scatter symbols
- Standard award: 10-20 free spins
- Retrigger: 3+ scatters for additional spins

### 2. File Organization

```
rules/
├── base/
│   ├── default-rules.json      # Standard balanced game
│   ├── high-volatility.json    # High risk/reward
│   └── low-volatility.json     # Frequent small wins
├── regional/
│   ├── europe-rules.json       # EU compliance
│   ├── asia-rules.json         # Asian market preferences
│   └── america-rules.json      # American market
├── seasonal/
│   ├── christmas-rules.json    # Holiday events
│   ├── halloween-rules.json    # Themed events
│   └── summer-rules.json       # Seasonal promotions
└── testing/
    ├── debug-rules.json        # High payouts for testing
    └── simulation-rules.json   # Specific test scenarios
```

### 3. Version Control

```json
{
  "version": "2.1.3",
  "gameType": "Zeus Cascading Slots",
  "description": "Updated scatter payouts for better balance",
  "changelog": [
    "2.1.3: Reduced scatter 6+ payout from 100x to 80x",
    "2.1.2: Increased Crown 12+ payout from 50x to 55x",
    "2.1.1: Fixed multiplier orb range validation"
  ]
}
```

### 4. Validation

```typescript
// Always validate custom rules before using
function validateRules(rules: PayoutRulesConfig): boolean {
  // Check required fields
  if (!rules.version || !rules.gameType || !rules.symbolPayouts) {
    return false;
  }

  // Validate symbol payouts
  for (const symbol of rules.symbolPayouts) {
    if (symbol.symbol < 0 || symbol.symbol > 8) {
      return false;
    }

    // Check payout tier ordering
    for (let i = 1; i < symbol.payouts.length; i++) {
      if (symbol.payouts[i].count <= symbol.payouts[i - 1].count) {
        return false; // Counts should be ascending
      }
    }
  }

  return true;
}
```

---

## Integration

### With Predefined Result Generator

```typescript
// Note: Current PredefinedResultGenerator uses its own PayoutCalculator
// To use custom rules, you would need to modify the generator:

class CustomPredefinedResultGenerator extends PredefinedResultGenerator {
  constructor(
    boardSettings: BoardSettings,
    multiplierConfig: MultiplierConfig,
    customRules?: PayoutRulesConfig,
    difficulty: Difficulty = Difficulty.Medium
  ) {
    super(boardSettings, multiplierConfig, difficulty);

    // Replace the default PayoutCalculator with custom one
    if (customRules) {
      this.payoutCalculator = new PayoutCalculator(1, customRules);
    }
  }
}
```

### With RTP Controller

```typescript
// Custom rules will automatically affect RTP calculations
const customCalculator = PayoutCalculator.createWithCustomRules("./high-rtp-rules.json");
const rtpController = new RTPController(rtpConfig, customCalculator);

// The controller will use the custom payout rules for all calculations
const validation = rtpController.validateRTP(boardResults);
```

### Environment-Based Loading

```typescript
function createEnvironmentCalculator(): PayoutCalculator {
  const environment = process.env.NODE_ENV || "development";

  switch (environment) {
    case "production":
      return PayoutCalculator.createWithCustomRules("./rules/production-rules.json");
    case "staging":
      return PayoutCalculator.createWithCustomRules("./rules/staging-rules.json");
    case "development":
      return PayoutCalculator.createWithCustomRules("./rules/debug-rules.json");
    default:
      return new PayoutCalculator(); // Default rules
  }
}
```

---

## Troubleshooting

### Common Issues

**1. JSON File Not Found**

```
Error: Could not load payout-rules.json, using hardcoded defaults
```

**Solution:** Ensure the JSON file exists in the correct location. The PayoutCalculator looks for files relative to the compiled `lib/` directory.

**2. Invalid JSON Format**

```
Error: Failed to load payout rules from ./custom-rules.json: SyntaxError
```

**Solution:** Validate your JSON syntax using a JSON validator or IDE with JSON support.

**3. Missing Required Fields**

```
TypeError: Cannot read property 'symbolPayouts' of undefined
```

**Solution:** Ensure your configuration includes all required fields. Use the TypeScript interfaces as a guide.

**4. Inconsistent Payout Tiers**

```
Warning: Payout counts should be in ascending order
```

**Solution:** Ensure `count` values in payout tiers increase: 8 → 10 → 12, not 8 → 12 → 10.

### Debug Mode

```typescript
// Enable detailed logging for rule loading
const debugCalculator = new PayoutCalculator(1, undefined);
console.log("Loaded rules:", debugCalculator.getRulesConfig());

// Test specific scenarios
const testBoard = [
  /* ... */
];
const result = debugCalculator.calculatePayout(testBoard, [], 1);
console.log("Payout result:", result);
```

### Rule Validation Script

```typescript
// Create a validation script for your custom rules
function validateCustomRules(filePath: string): void {
  try {
    const rules = PayoutCalculator.loadPayoutRulesFromFile(filePath);
    const calculator = new PayoutCalculator(1, rules);

    console.log(`✅ Rules loaded successfully from ${filePath}`);
    console.log(`   Game Type: ${rules.gameType}`);
    console.log(`   Version: ${rules.version}`);
    console.log(`   Symbols: ${rules.symbolPayouts.length}`);

    // Test basic functionality
    const testBoard = new Array(30).fill(0); // 30 crown symbols
    const result = calculator.calculatePayout(testBoard, [], 1);
    console.log(`   Test result: ${result.totalWin}x bet`);
  } catch (error) {
    console.error(`❌ Error validating rules: ${error.message}`);
  }
}

// Usage
validateCustomRules("./my-custom-rules.json");
```

---

## Advanced Topics

### Dynamic Rule Generation

```typescript
// Generate rules based on mathematical models
function generateBalancedRules(targetRTP: number): PayoutRulesConfig {
  // Mathematical model to calculate appropriate multipliers
  const baseMultipliers = calculateOptimalMultipliers(targetRTP);

  return {
    version: `generated-${targetRTP}`,
    gameType: `Auto-Generated ${targetRTP * 100}% RTP Slots`,
    description: `Mathematically balanced for ${targetRTP * 100}% RTP`,
    symbolPayouts: baseMultipliers.map((multipliers, index) => ({
      symbol: index,
      name: `Symbol ${index}`,
      type: getSymbolType(index),
      payouts: [
        { count: 8, multiplier: multipliers.low },
        { count: 10, multiplier: multipliers.medium },
        { count: 12, multiplier: multipliers.high },
      ],
    })),
    // ... rest of configuration
  };
}
```

### Rule Analytics

```typescript
// Analyze rule effectiveness
interface RuleAnalytics {
  estimatedRTP: number;
  volatilityIndex: number;
  averageWinFrequency: number;
  maxWinPotential: number;
}

function analyzeRules(rules: PayoutRulesConfig): RuleAnalytics {
  // Implement statistical analysis of rule set
  // This would require running simulations
  return {
    estimatedRTP: calculateEstimatedRTP(rules),
    volatilityIndex: calculateVolatility(rules),
    averageWinFrequency: calculateWinFrequency(rules),
    maxWinPotential: calculateMaxWin(rules),
  };
}
```

---

## Conclusion

The Custom Payout Rules system provides powerful flexibility for creating diverse slot game experiences. By separating game mechanics from code, you can:

- **Rapidly iterate** on game balance
- **A/B test** different configurations
- **Customize** for different markets or events
- **Maintain** multiple game variants easily

For more examples and advanced usage patterns, see the files in the `examples/` directory.

---

## API Reference

### PayoutCalculator Methods

- `new PayoutCalculator(baseMultiplier?, customRules?)` - Create calculator
- `PayoutCalculator.createWithCustomRules(filePath)` - Load from file
- `PayoutCalculator.loadPayoutRulesFromFile(filePath)` - Load rules only
- `calculatePayout(board, multipliers, betSize, accumulatedMultiplier?)` - Calculate payout
- `getRulesConfig()` - Get current rules
- `getPayoutRules()` - Get processed rules
- `updatePayoutRules(rules)` - Update rules

### Key Interfaces

- `PayoutRulesConfig` - Complete configuration structure
- `SymbolPayoutConfig` - Individual symbol configuration
- `ScatterPayoutConfig` - Scatter symbol configuration
- `MultiplierOrbConfig` - Multiplier orb settings
- `PayoutTier` - Individual payout tier
- `PayoutResult` - Calculation result structure
