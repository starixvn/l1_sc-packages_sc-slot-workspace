# Tumble Win Calculation Process

## Overview

This document outlines the tumble win calculation process in the sc-slot-board-statistic system. The actual calculation logic is handled by external dependencies, while this system consumes and analyzes the results.

## Architecture

### External Dependencies

The tumble win calculations are performed by external packages:

- **`sc-cascading-slot-base/src/board/round-calculator`** - Main calculation engine
- **`sc-cascading-slot-base/src/board/tumble-calculator`** - Tumble-specific calculations

### Internal Components

The statistic system consists of:

- **`statistic-runner.ts`** - Orchestrates the calculation process
- **`statistic-calculator.ts`** - Analyzes and aggregates results
- **`generator-definition.ts`** - Provides game configuration

## Data Flow

### 1. Round Initialization

Each round starts with basic round data:

```typescript
const round: Round = {
  id: i,
  coinValue: options.coinValue,
  betLevel: options.betLevel,
  betMultiplier: 20, // Fixed multiplier
  totalAmount: options.coinValue * options.betLevel * betMultiplier,
  odds: predefinedOdds
};
```

### 2. Processing Pipeline

```
Round Input → RoundCalculator.processSpinning() → Populated Round → Statistics
```

The `processSpinning()` method from the external RoundCalculator populates the round object with calculation results.

### 3. Calculator Setup

```typescript
const calculator = new RoundCalculator({
  boardGenerator: generator,
  tumbleCalculator: new TumbleCalculator(),
});
```

## Settlement Result Structure

After processing, the round object contains a `settlementResult` with the following structure:

### settlementResult Interface

```typescript
settlementResult?: {
  tumbles: {
    icons: Record<string, { count: number; odds: number }>;
    win: number;
    originalBoard: string;
    newBoard: string;
    multipliers: number[];
  }[];
  freeSpins: { count: number; odds: number };
  additionalFreeSpins: { count: number; odds: number };
};
```

### Tumbles Array

Each tumble in the `tumbles` array represents one cascading sequence:

- **`icons`** - Symbol combinations that created wins in this tumble
  - Key: Symbol identifier (string)
  - Value: `{ count: number; odds: number }` - Number of symbols and their payout odds
- **`win`** - Individual payout amount for this specific tumble
- **`originalBoard`** - Board state before this tumble (comma-separated string)
- **`newBoard`** - Board state after symbols are removed (comma-separated string)
- **`multipliers`** - Array of multiplier values applied during this tumble

### Free Spins Data

- **`freeSpins`** - Initial free spins triggered
  - `count`: Number of scatter symbols
  - `odds`: Number of free spins awarded
- **`additionalFreeSpins`** - Extra free spins won during free spin rounds
  - `count`: Number of scatter symbols in free spin
  - `odds`: Additional free spins awarded

## Round Result Properties

After processing, additional properties are populated in the round:

### Financial Results

- **`betwin`** - Total payout for the entire round
- **`totalTumbleWin`** - Sum of all individual tumble wins
- **`multiplier`** - Final multiplier value for the round

### Round Classification

- **`freeSpin`** - Boolean indicating if this is a free spin round
- **`freeSpinId`** - Index of free spin (for free spin rounds)

## Calculation Process (Inferred from Usage)

### 1. Initial Spin Processing

1. Generate initial board using BoardGenerator
2. Identify winning symbol combinations
3. Calculate initial payouts using odds tables
4. Remove winning symbols from board

### 2. Cascading Tumbles

1. Cascade remaining symbols downward
2. Fill empty positions with new symbols
3. Check for new winning combinations
4. Calculate additional payouts
5. Repeat until no more wins occur

### 3. Result Accumulation

1. Sum all individual tumble wins → `totalTumbleWin`
2. Apply multipliers and bonuses → `betwin`
3. Check for free spin triggers
4. Store detailed settlement data

## Statistics Integration

### Data Extraction

The statistics system extracts key metrics from the settlement result:

```typescript
// Total tumbles in round
statistic.round.maximumTumbles = max(statistic.round.maximumTumbles, round.settlementResult.tumbles.length);

// Multiplier count from last tumble
statistic.totalMultipliers += compose(length, prop("multipliers"), last)(round.settlementResult.tumbles);

// Free spins awarded
statistic.totalFreeSpins += round.settlementResult.freeSpins.odds;
```

### Symbol Analysis

The system analyzes symbol occurrences by parsing board states:

```typescript
const counts = map(compose(countBy(parseInt), split(","), prop("originalBoard")))(
  round.settlementResult.tumbles
);
```

This extracts symbol frequency data from each tumble's original board state.

## Configuration

### Board Settings

```typescript
boardSettings: {
  reels: 6,
  symbolsOnReel: 5,
  numberOfSymbols: 11,
  numberOfShuffles: 3,
}
```

### Multiplier Settings

```typescript
multiplier: {
  symbol: 10,    // Multiplier symbol ID
  min: 2,        // Minimum multiplier value
  max: 21,       // Maximum multiplier value
}
```

### Payout Tables

The system uses predefined payout tables for symbols 0-8:

- Symbols require 8+ matches for wins
- Higher-numbered symbols have higher payouts
- Symbol 9 is the free spin scatter
- Symbol 10 is the multiplier symbol

## Free Spin Mechanics

### Free Spin Triggering

Free spins are triggered by scatter symbols (symbol 9):

```typescript
freeSpins: {
  symbol: 9,
  initialOdds: [
    { count: 4, odds: 3 },   // 4 scatters = 3 free spins
    { count: 5, odds: 6 },   // 5 scatters = 6 free spins
    { count: 6, odds: 18 },  // 6 scatters = 18 free spins
  ],
  additionalOdds: [{ count: 4, odds: 5 }], // During free spins
}
```

### Free Spin Processing

1. Execute base round normally
2. Check for free spin triggers in `settlementResult.freeSpins.odds`
3. Execute free spin rounds with accumulated multipliers
4. Multipliers persist and accumulate across free spins
5. Additional free spins can be won during free spin rounds

### Multiplier Accumulation

During free spins:

```typescript
if (freeSpinRound.betwin) {
  multiplier += freeSpinRound.multiplier;
}
```

Multipliers accumulate across all free spin rounds and apply to subsequent spins.

## Important Notes

1. **External Implementation**: The core calculation logic resides in external packages not present in this codebase
2. **Data Consumer**: This system primarily consumes and analyzes calculation results
3. **No Direct Calculation**: The statistic system does not perform tumble calculations directly
4. **Result Processing**: Focus is on statistical analysis and reporting of external calculation results
5. **Interface Contracts**: The system relies on the settlementResult interface contract from external calculators

## Usage in Statistics

The settlement result data is used for:

- RTP calculation (`betwin` / `totalAmount`)
- Win frequency analysis
- Symbol occurrence tracking
- Multiplier distribution analysis
- Free spin frequency and effectiveness
- Maximum value tracking (biggest wins, most tumbles, etc.)
- Variance and deviation calculations
