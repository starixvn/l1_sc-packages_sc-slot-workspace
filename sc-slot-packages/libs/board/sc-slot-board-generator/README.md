# SC Slot Board Generator

A comprehensive TypeScript library for generating cascading slot game boards with configurable payout rules and predefined result chains.

## Features

- **🎰 Cascading Slot Mechanics** - Complete implementation of tumbling/cascading reels
- **⚡ Configurable Payout Rules** - JSON-based payout configuration for easy customization
- **🎯 RTP Management** - Precise Return To Player control and validation
- **📊 Predefined Results** - Generate sequences of boards that meet specific RTP targets
- **🔧 Multiple Game Variants** - Support for different volatility and payout configurations
- **🧪 Comprehensive Testing** - Full test suite ensuring reliability

## Quick Start

```typescript
import { PayoutCalculator, generateDemoChain } from "sc-slot-board-generator";

// Basic payout calculation
const calculator = new PayoutCalculator();
const result = calculator.calculatePayout(board, multipliers, betSize);

// Generate predefined chain with 97% RTP
const chain = await generateDemoChain(100, 0.97);
console.log(`Generated ${chain.boards.length} boards with ${chain.rtpResult.actualRTP}% RTP`);
```

## Documentation

- **[Custom Payout Rules Guide](CUSTOM_PAYOUT_RULES_GUIDE.md)** - Complete guide to configuring game mechanics
- **[Predefined Results Documentation](PREDEFINED_RESULTS.md)** - Working with predefined board sequences
- **[Predefined Results Generation Script](PREDEFINED_RESULTS_GENERATION.md)** - CLI tool for generating result chains
- **[Examples](examples/)** - Practical usage examples and configurations

## Game Mechanics

### Symbols and Payouts

- **9 Regular Symbols** (0-8): Crown, Hourglass, Ring, Goblet, and Gems
- **Zeus Scatter Symbol** (9): Triggers free spins (4+ symbols)
- **Multiplier Orb** (10): Accumulates multipliers during free spins

### Win Detection

- **Count-based wins**: 8+ matching symbols anywhere on the grid
- **Tiered payouts**: Different multipliers for 8-9, 10-11, and 12+ symbols
- **Scatter bonuses**: 4 scatters (3x), 5 scatters (5x), 6+ scatters (100x)

### Free Spins Feature

- **Trigger**: 4+ Zeus scatter symbols award 15 free spins
- **Accumulating Multipliers**: Multiplier orbs add to persistent total
- **Retrigger**: 3+ Zeus during free spins award additional 5 spins

## API Overview

```typescript
// Core Classes
import {
  PayoutCalculator, // Calculate wins and payouts
  RTPController, // Validate and manage RTP
  PredefinedResultGenerator, // Generate board sequences
  BoardGenerator, // Generate individual boards
} from "sc-slot-board-generator";

// Configuration Types
import {
  PayoutRulesConfig, // Complete game configuration
  RTPConfiguration, // RTP validation settings
  PredefinedChainConfig, // Chain generation settings
} from "sc-slot-board-generator";
```

## Examples

### Custom Payout Rules

```typescript
// Load custom rules from file
const calculator = PayoutCalculator.createWithCustomRules("./high-volatility-rules.json");

// Or create programmatically
const customRules: PayoutRulesConfig = {
  version: "2.0",
  gameType: "High Stakes Zeus",
  symbolPayouts: [
    {
      symbol: 0,
      name: "Crown",
      type: "premium",
      payouts: [
        { count: 8, multiplier: 20 }, // Doubled payouts!
        { count: 10, multiplier: 50 },
        { count: 12, multiplier: 100 },
      ],
    },
    // ... more symbols
  ],
  // ... rest of configuration
};

const customCalculator = new PayoutCalculator(1, customRules);
```

### RTP-Controlled Board Generation

```typescript
import { generatePredefinedChain } from "sc-slot-board-generator";

// Generate 120 boards with 97% RTP
const chain = await generatePredefinedChain({
  boardCount: 120,
  targetRTP: 0.97,
  tolerance: 0.01,
  maxRetries: 10,
});

console.log(`RTP: ${chain.rtpResult.actualRTP}%`);
console.log(`Total boards: ${chain.boards.length}`);
console.log(`Generation attempts: ${chain.generationStats.attempts}`);
```

### CLI Script for Predefined Results

Generate predefined result chains using the command-line script:

```bash
# Generate default configuration (120 boards, 97% RTP)
npm run generate

# Generate quick demo (50 boards)
npm run generate:demo

# Generate multiple configurations
npm run generate:batch

# Custom configuration
npm run generate -- --boards 200 --rtp 0.96 --output custom-results.json

# Show all options
npm run generate:help
```

## Installation

```bash
npm install sc-slot-board-generator
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build library
npm run build

# Run examples
npx ts-node examples/new-game-mechanics-example.ts
```

## Configuration Files

The library uses JSON configuration files for maximum flexibility:

- **`src/payout-rules.json`** - Default game configuration
- **`examples/high-volatility-rules.json`** - High-risk/high-reward variant
- **Custom configurations** - Create your own rule sets

## Testing

Comprehensive test suite covering:

- Payout calculations for all symbol combinations
- RTP validation and control
- Predefined result generation
- Edge cases and error handling

```bash
npm test                                    # Run all tests
npm test tests/predefined-results.test.ts   # Run specific test file
```

## License

MIT License - see LICENSE file for details.
