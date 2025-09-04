# 🛠️ Development Guidelines

Essential rules and best practices for working with the slot board generation system to ensure code quality, consistency, and reliability.

## 📋 Core Development Rules

### 1. 🔧 Always Use ts-node Loader for Scripts

**Rule**: All TypeScript scripts must use the `ts-node/esm` loader for execution.

**Required Format**:
```json
"scripts": {
    "script-name": "node --experimental-specifier-resolution=node --loader ts-node/esm src/script-name.ts"
}
```

**❌ Incorrect**:
```bash
# DON'T do this
node src/script.ts
npx ts-node src/script.ts
npm run ts-node src/script.ts
```

**✅ Correct**:
```bash
# Always use the full loader specification
node --experimental-specifier-resolution=node --loader ts-node/esm src/script.ts
```

**Rationale**: Ensures proper ES module resolution, TypeScript compilation, and import path handling.

### 2. 🔍 Always Check Interfaces Before Implementation

**Rule**: Before implementing any function or component, verify the exact interfaces and types from the source packages.

**Required Process**:
1. **Check source interfaces** before writing code
2. **Verify property names** and types
3. **Validate method signatures** 
4. **Test with actual data** before assuming structure

**Example Workflow**:
```typescript
// ❌ DON'T assume interface structure
function processBoard(board: any) {
    return board.totalWin + board.cascadeWin; // May not exist!
}

// ✅ DO check actual interface first
// 1. Check sc-cascading-slot-base for actual structure
// 2. Verify with console.log() or debugger
// 3. Then implement based on reality

function processBoard(board: any) {
    // Verified from actual settlement results
    let totalWin = 0;
    if (board.settlementResult?.tumbles) {
        board.settlementResult.tumbles.forEach((tumble: any) => {
            totalWin += tumble.win || 0;
        });
    }
    return totalWin;
}
```

**Interface Verification Checklist**:
- [ ] Checked actual package exports
- [ ] Verified with real data/console output
- [ ] Tested property access
- [ ] Validated method signatures
- [ ] Confirmed TypeScript compilation

### 3. 🏗️ Always Build to Check for Errors

**Rule**: Run TypeScript compilation before committing any code changes.

**Required Commands**:
```bash
# Compilation check (required before commits)
npx tsc --noEmit

# For specific files
npx tsc --noEmit src/your-file.ts

# For entire project
npx tsc --noEmit --project tsconfig.json
```

**Pre-Commit Checklist**:
- [ ] `npx tsc --noEmit` passes without errors
- [ ] All imports resolve correctly
- [ ] No TypeScript compilation errors
- [ ] No missing type definitions
- [ ] Runtime testing completed

**Error Resolution Process**:
1. **Fix compilation errors first** (never ignore)
2. **Verify import paths** use `.js` extensions for local files
3. **Check dependency versions** match requirements
4. **Test runtime behavior** after compilation fixes

### 4. 🎯 Strictly Follow sc-cascading-slot-base (No Assumptions)

**Rule**: Never assume the structure of `settlementResult`. Always follow the actual implementation from `sc-cascading-slot-base`.

**Required Verification Process**:

1. **Import the Real Types**:
```typescript
// ✅ Use actual imports from source
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
```

2. **Debug Actual Structure**:
```typescript
// ✅ Always log actual structure first
console.log('settlementResult:', JSON.stringify(board.settlementResult, null, 2));

// ✅ Then implement based on what you see
if (board.settlementResult?.tumbles) {
    board.settlementResult.tumbles.forEach((tumble: any) => {
        console.log('tumble structure:', Object.keys(tumble));
        // Use only properties that actually exist
    });
}
```

3. **Follow Exact Property Names**:
```typescript
// ❌ DON'T assume property names
const win = board.totalWin || board.winAmount || board.payout; // Wrong!

// ✅ DO use exact property names from actual data
const win = board.settlementResult.tumbles.reduce((sum: number, tumble: any) => 
    sum + (tumble.win || 0), 0
);
```

**Forbidden Assumptions**:
- ❌ Property names (e.g., assuming `totalWin` exists)
- ❌ Data structure (e.g., assuming arrays vs objects)
- ❌ Method signatures (e.g., assuming parameter types)
- ❌ Default values (e.g., assuming 0 for missing properties)
- ❌ Nested object structure (e.g., assuming `result.data.win`)

**Required Documentation**:
When working with `settlementResult`, always document the actual structure:
```typescript
/**
 * Based on actual settlementResult from sc-cascading-slot-base:
 * {
 *   tumbles: [{ 
 *     originalBoard: string,
 *     newBoard: string, 
 *     multipliers: number[],
 *     icons: {},
 *     win: number 
 *   }],
 *   freeSpins: { count: number, odds: number }
 * }
 */
```

## 🧪 Testing Requirements

### Unit Testing Rules
```typescript
describe('Component Tests', () => {
    beforeEach(() => {
        // ✅ Always verify TypeScript compilation
        expect(() => require('../src/component')).not.toThrow();
    });

    it('should handle real settlementResult structure', () => {
        // ✅ Use actual structure from sc-cascading-slot-base
        const realSettlement = {
            tumbles: [{ win: 1.5, originalBoard: '...', newBoard: '...', multipliers: [2], icons: {} }],
            freeSpins: { count: 0, odds: 0 }
        };
        
        const result = processSettlement(realSettlement);
        expect(result).toBeDefined();
    });
});
```

### Integration Testing Rules
```typescript
describe('Settlement Integration', () => {
    it('should work with real sc-cascading-slot-base', async () => {
        // ✅ Test with actual external dependency
        const calculator = new RoundCalculator({
            boardGenerator: mockGenerator,
            tumbleCalculator: new TumbleCalculator()
        });
        
        // ✅ Verify actual output structure
        calculator.processSpinning(round, 0);
        expect(round.settlementResult).toBeDefined();
        expect(round.settlementResult.tumbles).toBeInstanceOf(Array);
    });
});
```

## 📦 Dependency Management Rules

### Import Standards
```typescript
// ✅ Correct import format for external packages
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import { Difficulty } from "sc-slot-board-generator";

// ✅ Correct import format for local files (use .js extension)
import { RTPController } from "./rtp-controller.js";
import { BoardGeneratorAdapter } from "./board-generator-adapter.js";
```

### Version Compatibility
```json
// ✅ Always specify exact compatible versions
{
  "dependencies": {
    "sc-slot-board-generator": "1.2.0-beta.1",
    "sc-cascading-slot-base": "2.0.0"
  }
}
```

## 🔄 Development Workflow

### 1. Pre-Development Checklist
- [ ] Check latest interface definitions
- [ ] Verify dependency versions
- [ ] Review existing similar implementations
- [ ] Set up proper TypeScript configuration

### 2. During Development
- [ ] Use TypeScript strict mode
- [ ] Log actual data structures first
- [ ] Implement based on verified interfaces
- [ ] Test with real data continuously

### 3. Pre-Commit Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] All scripts use proper ts-node loader
- [ ] No assumptions about external interfaces
- [ ] Runtime testing completed
- [ ] Documentation updated

### 4. Code Review Requirements
- [ ] Interfaces verified from source
- [ ] No hardcoded assumptions
- [ ] Proper error handling
- [ ] TypeScript compilation clean

## ⚠️ Common Mistakes to Avoid

### 1. Import Path Errors
```typescript
// ❌ Missing .js extension for local imports
import { Component } from "./component";

// ✅ Correct local import
import { Component } from "./component.js";
```

### 2. Interface Assumptions
```typescript
// ❌ Assuming property existence
const win = board.totalWin;

// ✅ Verifying property existence
const win = board.settlementResult?.tumbles?.reduce((sum, tumble) => 
    sum + (tumble.win || 0), 0) || 0;
```

### 3. Script Execution
```typescript
// ❌ Incorrect script configuration
"test": "ts-node src/test.ts"

// ✅ Correct script configuration  
"test": "node --experimental-specifier-resolution=node --loader ts-node/esm src/test.ts"
```

## 🚨 Error Handling Standards

### Required Error Patterns
```typescript
// ✅ Proper error handling for external dependencies
try {
    const calculator = new RoundCalculator({
        boardGenerator: generator,
        tumbleCalculator: new TumbleCalculator()
    });
    return true;
} catch (error) {
    console.warn("⚠️  External calculator initialization failed:", error.message);
    return false; // Graceful degradation
}

// ✅ Proper property access error handling
function getWinAmount(board: any): number {
    try {
        if (board.settlementResult?.tumbles) {
            return board.settlementResult.tumbles.reduce((sum: number, tumble: any) => 
                sum + (tumble.win || 0), 0
            );
        }
        return 0;
    } catch (error) {
        console.error("Error calculating win amount:", error);
        return 0;
    }
}
```

## 📚 Documentation Requirements

### Code Documentation
- Document actual interface structures when discovered
- Include example data structures in comments
- Note any deviations from expected behavior
- Record dependency version requirements

### Commit Messages
- Mention interface verification: "Verified settlementResult structure"
- Note compilation status: "TypeScript compilation clean"
- Reference external dependencies: "Compatible with sc-cascading-slot-base@2.0.0"

---

## 📋 Quick Reference Checklist

Before any commit:
- [ ] All scripts use `--loader ts-node/esm`
- [ ] `npx tsc --noEmit` passes without errors
- [ ] All interfaces verified from actual source data
- [ ] No assumptions about `settlementResult` structure
- [ ] Runtime testing with real dependencies completed
- [ ] Error handling implemented for external dependencies
- [ ] Documentation updated with actual discovered structures

**Remember**: These rules exist to prevent integration bugs, reduce debugging time, and ensure reliable code that works with real external dependencies.

---

**Version**: v1.0  
**Status**: ✅ Mandatory Guidelines  
**Last Updated**: December 2024
