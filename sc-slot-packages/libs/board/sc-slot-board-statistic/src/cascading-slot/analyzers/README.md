# Analyzers Module

This module contains analysis tools for multiplier collection and statistical analysis of slot machine behavior.

## Files

### Scripts
- **`multiplier-collector.ts`** - Main multiplier collection script that runs statistics and collects spins with multipliers
- **`analyze-multipliers.ts`** - Analyzes the relationship between symbol 10 (multiplier symbol) and multipliers array
- **`analyze-cascading-multipliers.ts`** - Analyzes how symbol 10s cascade and get new multiplier values during tumbles

## Usage

### Collect Multipliers
```bash
npm run collect-multipliers
```

### Direct Analysis Scripts
```bash
# Analyze multipliers
node --experimental-specifier-resolution=node --loader ts-node/esm src/cascading-slot/analyzers/analyze-multipliers.ts

# Analyze cascading multipliers  
node --experimental-specifier-resolution=node --loader ts-node/esm src/cascading-slot/analyzers/analyze-cascading-multipliers.ts
```

## Purpose

These tools are used for:
- **Statistical Analysis** - Understanding multiplier behavior in slot games
- **Data Collection** - Gathering multiplier data from game sessions
- **Validation** - Verifying multiplier mechanics work correctly
- **Research** - Analyzing cascading behavior and symbol interactions

## Output

The scripts generate JSON files containing:
- Multiplier spin data
- Settlement results
- Board state analysis
- Statistical summaries

