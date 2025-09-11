# preGeneratedResult Generation Guide

## Overview

The `preGeneratedResult` array provides pre-calculated cascading slot data to `RoundCalculator.processSpinning()`. This guide explains how to structure this data correctly.

## Key Rule: N+1 Array Items for N Tumbles

**Critical**: To generate N final tumbles, you need N+1 items in the `preGeneratedResult` array.

```javascript
// For 2 tumbles in final result → Need 3 array items
// For 3 tumbles in final result → Need 4 array items
// etc.
```

## Data Structure Template

```javascript
const preGeneratedResult = [
  // Item 1: Creates firstTumble
  {
    newBoard: [
      /* 30 integers for 6x5 board */
    ],
    multipliers: [
      /* multiplier values */
    ],
    icons: {}, // Always empty - calculated by TumbleCalculator
    explodedSymbols: [], // Not used for tumble creation
    newSymbols: [], // Not used for tumble creation
  },

  // Item 2: Provides explodedSymbols/newSymbols for firstTumble
  {
    newBoard: [
      /* board after first cascade */
    ],
    multipliers: [
      /* carried forward */
    ],
    icons: {},
    explodedSymbols: [
      /* what exploded in first tumble */
    ],
    newSymbols: [
      /* what dropped in first tumble */
    ],
  },

  // Item 3: Provides explodedSymbols/newSymbols for secondTumble
  // OR stops cascade if arrays are empty
  {
    newBoard: [
      /* final board state */
    ],
    multipliers: [
      /* carried forward */
    ],
    icons: {},
    explodedSymbols: [], // Empty = no more cascades
    newSymbols: [], // Empty = cascade stops
  },
];
```

## Array Consumption Flow

```javascript
// RoundCalculator.processSpinning() consumes data like this:

// Step 1: Create first tumble
const generatedResult = preGeneratedResult.shift(); // Uses item 1
// → firstTumble created with generatedResult.newBoard

// Step 2: Process first tumble cascade (if wins found)
const refilledResult = preGeneratedResult.shift(); // Uses item 2
// → firstTumble.explodedSymbols = refilledResult.explodedSymbols
// → firstTumble.newSymbols = refilledResult.newSymbols

// Step 3: Create second tumble
// → secondTumble created with refilledResult.newBoard

// Step 4: Process second tumble cascade (if wins found)
const refilledResult = preGeneratedResult.shift(); // Uses item 3
// → secondTumble.explodedSymbols = refilledResult.explodedSymbols
// → If explodedSymbols is empty → cascade stops
```

## Data Format Requirements

### Board Format

- **newBoard**: Array of 30 integers (6 reels × 5 symbols)
- **Values**: 0-8 (normal symbols), 9 (free spin), 10 (multiplier)

### explodedSymbols Format

- **Length**: 30 elements (same as board)
- **Values**:
  - `-1` = symbol NOT exploded
  - `original_symbol_value` = symbol WAS exploded
- **Empty array `[]`** = no symbols exploded (stops cascade)

### newSymbols Format

- **Length**: 30 elements (same as board)
- **Values**:
  - `-1` = no new symbol at this position
  - `new_symbol_value` = symbol that dropped in
- **Empty array `[]`** = no new symbols (stops cascade)

## Quick Examples

### Single Tumble (No Cascade)

```javascript
const preGeneratedResult = [
  {
    newBoard: [1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3],
    multipliers: [1],
    icons: {},
    explodedSymbols: [],
    newSymbols: [],
  },
  {
    newBoard: [1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3],
    multipliers: [1],
    icons: {},
    explodedSymbols: [], // Empty = no cascade
    newSymbols: [], // Empty = no cascade
  },
];
```

### Two Tumbles (One Cascade)

```javascript
const preGeneratedResult = [
  // Creates first tumble with winning 8's
  {
    newBoard: [8, 8, 8, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [],
    newSymbols: [],
  },

  // Provides cascade data for first tumble
  {
    newBoard: [4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [8, 8, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    newSymbols: [4, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  },

  // Stops cascade (no more wins)
  {
    newBoard: [4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1],
    multipliers: [1],
    icons: {},
    explodedSymbols: [], // Empty = stops cascade
    newSymbols: [], // Empty = stops cascade
  },
];
```

## Common Mistakes to Avoid

❌ **Wrong**: Same number of items as expected tumbles  
✅ **Correct**: One extra item (N+1 for N tumbles)

❌ **Wrong**: Putting explodedSymbols in first array item  
✅ **Correct**: explodedSymbols go in the NEXT array item

❌ **Wrong**: Non-empty arrays in final item  
✅ **Correct**: Final item should have empty explodedSymbols/newSymbols arrays

## Validation Checklist

- [ ] Array length = expected_tumbles + 1
- [ ] All newBoard arrays have exactly 30 integers
- [ ] explodedSymbols/newSymbols have 30 elements OR are empty arrays
- [ ] Final item has empty explodedSymbols and newSymbols arrays
- [ ] Board symbols are valid (0-10 range)
- [ ] multipliers array is not empty (at least [1])

## Testing Your Data

```javascript
// Quick validation function
function validatePreGeneratedResult(data, expectedTumbles) {
  console.assert(data.length === expectedTumbles + 1, "Wrong array length");
  console.assert(data[data.length - 1].explodedSymbols.length === 0, "Final item should stop cascade");
  data.forEach((item, i) => {
    console.assert(item.newBoard.length === 30, `Item ${i}: wrong board size`);
    console.assert(item.multipliers.length > 0, `Item ${i}: empty multipliers`);
  });
  console.log("Validation passed!");
}
```

This structure ensures smooth integration with `RoundCalculator.processSpinning()` and proper cascade behavior.

## Testing Utilities

For testing and debugging `preGeneratedResult` data, use the utilities in `src/board/pregeneratedresult-utils.js`:

### Quick Testing Methods

```javascript
import { copyFirstBoardForTesting, createWorkingCopy, peekFirstBoard, logBoardStructure, simulateConsumption } from "../pregeneratedresult-utils";

// Method 1: Copy first board for inspection (preserves original)
const { firstBoardCopy } = copyFirstBoardForTesting(preGeneratedResult);
console.log("First board:", firstBoardCopy.newBoard);

// Method 2: Peek at first board without consuming
const firstBoard = peekFirstBoard(preGeneratedResult);
console.log("Winning symbols:", firstBoard.newBoard.slice(0, 3));

// Method 3: Create working copy that can be consumed
const workingCopy = createWorkingCopy(preGeneratedResult);
const item1 = workingCopy.shift(); // Safe to consume
const item2 = workingCopy.shift(); // Original untouched

// Method 4: Simulate complete processSpinning consumption
const result = simulateConsumption(preGeneratedResult);
console.log("Expected tumbles:", result.expectedTumbles);

// Method 5: Log detailed structure for debugging
logBoardStructure(preGeneratedResult, "My Test Data");
```

### Testing Workflow Example

```javascript
// Complete testing workflow
describe("Testing My Chain Data", () => {
  it("should process correctly", () => {
    // 1. Inspect structure
    const isValid = logBoardStructure(myPreGeneratedResult);
    expect(isValid).toBe(true);

    // 2. Simulate behavior
    const simulation = simulateConsumption(myPreGeneratedResult);
    expect(simulation.expectedTumbles).toBe(2); // Expected result

    // 3. Test specific properties
    const firstBoard = peekFirstBoard(myPreGeneratedResult);
    expect(firstBoard.newBoard[0]).toBe(8); // First symbol should be 8

    // 4. Create working copy for actual testing
    const workingCopy = createWorkingCopy(myPreGeneratedResult);
    // ... use workingCopy with actual processSpinning calls
  });
});
```

These utilities allow you to:

- ✅ Test data structure without consuming original arrays
- ✅ Simulate `processSpinning()` consumption behavior
- ✅ Debug cascade logic and expected tumble counts
- ✅ Validate board properties before processing
- ✅ Create safe working copies for actual processing tests
