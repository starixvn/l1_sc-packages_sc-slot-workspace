# Chain Management Guide

## Overview

The result chain system now includes an **active status** feature that allows you to control which chains can be assigned to games. This is useful for:

- **Testing**: Disable chains during testing without deleting them
- **Version Control**: Keep old chains inactive while using new ones
- **A/B Testing**: Easily switch between different chain configurations
- **Maintenance**: Temporarily disable problematic chains
- **Game Balancing**: Control which volatility/pattern combinations are available

---

## Active Status Field

### Database Schema

```typescript
interface IResultChain {
    name: string;
    boardsData: any[];
    betLevel: number;
    coinValue: number;
    totalBoardCount: number;
    baseBetAmount: number;
    volatility?: string;
    patternType?: string;
    active: boolean;  // ← New field
    createdAt: Date;
}
```

### Default Behavior

- **All imported chains are `active: true` by default**
- Chains can be activated/deactivated at any time
- Inactive chains remain in the database but won't be assigned to games

### Indexes

The following indexes are created for efficient querying:

```typescript
// Single field index
{ active: 1 }

// Composite indexes for game assignment
{ active: 1, volatility: 1, patternType: 1 }
```

---

## Managing Chain Status

### Command-Line Tool

Use the `manage-chain-status` script to control chain activation:

```bash
cd sc-slot-packages/libs/board/sc-slot-board-statistic
npm run manage-chain-status <action> [arguments]
```

### Actions

#### 1. **Activate/Deactivate Single Chain**

```bash
# Activate a chain by ID
npm run manage-chain-status activate 507f1f77bcf86cd799439011

# Deactivate a chain by ID
npm run manage-chain-status deactivate 507f1f77bcf86cd799439011
```

**Output:**
```
✅ Chain activated successfully
   ID: 507f1f77bcf86cd799439011
   Name: tease-veryhigh-50boards-bet0_05-1761192691292
   Status: ACTIVE
```

#### 2. **Bulk Activate/Deactivate by Pattern**

```bash
# Deactivate all "tease" pattern chains
npm run manage-chain-status bulk-deactivate pattern=tease

# Activate all "comeback" pattern chains
npm run manage-chain-status bulk-activate pattern=comeback
```

**Output:**
```
✅ Updated 12 chains to active=false
```

#### 3. **Bulk Activate/Deactivate by Volatility**

```bash
# Deactivate all "VeryHigh" volatility chains
npm run manage-chain-status bulk-deactivate volatility=VeryHigh

# Activate all "Medium" volatility chains
npm run manage-chain-status bulk-activate volatility=Medium
```

#### 4. **Bulk Operations with Multiple Filters**

```bash
# Deactivate all "VeryHigh" volatility + "tease" pattern chains
npm run manage-chain-status bulk-deactivate volatility=VeryHigh pattern=tease

# Activate all "Low" volatility + "comeback" pattern chains
npm run manage-chain-status bulk-activate volatility=Low pattern=comeback
```

#### 5. **List Active/Inactive Chains**

```bash
# List all active chains
npm run manage-chain-status list-active

# List all inactive chains
npm run manage-chain-status list-inactive
```

**Output:**
```
Found 3 active chains:

   507f1f77bcf86cd799439011 | tease-veryhigh-50boards-bet0_05-1761192691292
      Volatility: VeryHigh | Pattern: tease
      Boards: 50 | Bet: 0.05

   507f1f77bcf86cd799439012 | comeback-medium-100boards-bet0_05-1761192691293
      Volatility: Medium | Pattern: comeback
      Boards: 100 | Bet: 0.05
```

---

## Programmatic Usage

### In Your Application Code

#### Filter Active Chains Only

```typescript
import { ResultChainRepository } from '../database/repositories/result-chain-repository';

const repository = new ResultChainRepository();

// Get only active chains with specific volatility
const activeChains = await repository.getFiltered({
    active: true,
    volatility: 'VeryHigh',
    patternType: 'tease'
});

console.log(`Found ${activeChains.total} active chains`);
```

#### Activate/Deactivate Programmatically

```typescript
// Activate a chain
const chain = await repository.activate('507f1f77bcf86cd799439011');
console.log(`Chain ${chain.name} is now active: ${chain.active}`);

// Deactivate a chain
const inactiveChain = await repository.deactivate('507f1f77bcf86cd799439011');
console.log(`Chain ${inactiveChain.name} is now inactive: ${!inactiveChain.active}`);

// Bulk update
const updatedCount = await repository.bulkUpdateActiveStatus(
    { volatility: 'VeryHigh' },
    false  // Set to inactive
);
console.log(`Deactivated ${updatedCount} chains`);
```

---

## Use Cases

### 1. **Testing New Chains**

```bash
# Generate new chains
npm run generate-chains 50 tease VeryHigh

# Import them (automatically active)
npm run import-chains

# Test in game...

# If there are issues, deactivate immediately
npm run manage-chain-status bulk-deactivate volatility=VeryHigh pattern=tease
```

### 2. **Version Rollback**

```bash
# Something wrong with new chains? Rollback!

# Deactivate all recently imported chains
npm run manage-chain-status bulk-deactivate pattern=tease

# Reactivate old working chains
npm run manage-chain-status bulk-activate pattern=comeback
```

### 3. **A/B Testing**

```bash
# Week 1: Test VeryHigh volatility
npm run manage-chain-status bulk-activate volatility=VeryHigh
npm run manage-chain-status bulk-deactivate volatility=Medium

# Week 2: Test Medium volatility
npm run manage-chain-status bulk-deactivate volatility=VeryHigh
npm run manage-chain-status bulk-activate volatility=Medium

# Compare player engagement metrics...
```

### 4. **Gradual Rollout**

```bash
# Start with only "comeback" pattern active
npm run manage-chain-status bulk-activate pattern=comeback
npm run manage-chain-status bulk-deactivate pattern=tease
npm run manage-chain-status bulk-deactivate pattern=cliffhanger

# After 1 week, add "tease"
npm run manage-chain-status bulk-activate pattern=tease

# After 2 weeks, add "cliffhanger"
npm run manage-chain-status bulk-activate pattern=cliffhanger
```

### 5. **Maintenance Mode**

```bash
# Disable all chains temporarily
npm run manage-chain-status bulk-deactivate volatility=VeryHigh
npm run manage-chain-status bulk-deactivate volatility=High
npm run manage-chain-status bulk-deactivate volatility=Medium
npm run manage-chain-status bulk-deactivate volatility=MediumLow
npm run manage-chain-status bulk-deactivate volatility=Low

# Re-enable after maintenance
npm run manage-chain-status bulk-activate volatility=VeryHigh
# ... etc
```

---

## Game Assignment Logic

When assigning chains to games, **always filter by `active: true`**:

```typescript
async function assignChainToGame(
    playerId: string,
    volatility: string,
    patternType: string,
    betAmount: number
) {
    const repository = new ResultChainRepository();
    
    // Find suitable active chains only
    const chains = await repository.getFiltered({
        active: true,              // ← Only active chains
        volatility: volatility,
        patternType: patternType,
        baseBetAmountMin: betAmount * 0.9,
        baseBetAmountMax: betAmount * 1.1
    });
    
    if (chains.total === 0) {
        throw new Error('No active chains available for this configuration');
    }
    
    // Randomly select one chain
    const selectedChain = chains.chains[Math.floor(Math.random() * chains.chains.length)];
    return selectedChain;
}
```

---

## Best Practices

### 1. **Never Delete Chains**

Instead of deleting chains, deactivate them:

```bash
# ❌ DON'T: Delete chains from database
# ✅ DO: Deactivate them
npm run manage-chain-status deactivate 507f1f77bcf86cd799439011
```

This preserves historical data and allows you to reactivate chains if needed.

### 2. **Always Filter by Active Status in Production**

```typescript
// ❌ BAD: Returns all chains (including inactive)
const chains = await repository.getFiltered({ volatility: 'VeryHigh' });

// ✅ GOOD: Returns only active chains
const chains = await repository.getFiltered({ 
    active: true, 
    volatility: 'VeryHigh' 
});
```

### 3. **Use Bulk Operations for Efficiency**

```bash
# ❌ SLOW: Deactivate chains one by one
npm run manage-chain-status deactivate 507f1f77bcf86cd799439011
npm run manage-chain-status deactivate 507f1f77bcf86cd799439012
npm run manage-chain-status deactivate 507f1f77bcf86cd799439013

# ✅ FAST: Bulk deactivate by filter
npm run manage-chain-status bulk-deactivate volatility=VeryHigh
```

### 4. **Monitor Active Chain Count**

Always ensure you have enough active chains available:

```bash
# Check active chains before deploying
npm run manage-chain-status list-active

# Should see at least 5-10 chains per volatility/pattern combination
```

### 5. **Document Status Changes**

Keep a log of when and why you activate/deactivate chains:

```bash
# Example: Create a simple log
echo "$(date): Deactivated VeryHigh chains due to high variance" >> chain-status-log.txt
npm run manage-chain-status bulk-deactivate volatility=VeryHigh
```

---

## Troubleshooting

### Problem: "No active chains available"

**Symptoms:**
```
Error: No active chains available for this configuration
```

**Solution:**
```bash
# Check if chains are inactive
npm run manage-chain-status list-inactive

# Reactivate them
npm run manage-chain-status bulk-activate volatility=VeryHigh
```

### Problem: Too many chains returned

**Symptoms:**
```
Warning: 500 active chains found, performance may be impacted
```

**Solution:**
```bash
# Deactivate old chains (keep only recent ones)
npm run manage-chain-status bulk-deactivate pattern=old_pattern

# Or use more specific filters in your queries
```

### Problem: Accidentally deactivated all chains

**Symptoms:**
```
Game assignment failing - no chains available
```

**Solution:**
```bash
# List all inactive chains
npm run manage-chain-status list-inactive

# Reactivate all chains
npm run manage-chain-status bulk-activate volatility=VeryHigh
npm run manage-chain-status bulk-activate volatility=High
# ... etc for all volatility levels
```

---

## Summary

The **active status** feature provides fine-grained control over which chains are available for game assignment without requiring database deletions. This enables:

✅ Safe testing and rollback  
✅ A/B testing different configurations  
✅ Gradual feature rollouts  
✅ Easy maintenance mode  
✅ Historical data preservation  

**Key Points:**
- All imported chains are `active: true` by default
- Use `manage-chain-status` script for CLI management
- Always filter by `active: true` in production code
- Prefer deactivation over deletion
- Use bulk operations for efficiency

For more information, see:
- `result-chain.model.ts` - Database schema
- `result-chain-repository.ts` - Repository methods
- `manage-chain-status.ts` - CLI tool

