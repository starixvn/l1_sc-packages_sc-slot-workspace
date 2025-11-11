#!/usr/bin/env ts-node

/**
 * Multiplier Collector Script
 * Runs statistics using spinABatch and collects spins with multipliers
 * Saves settlement data to JSON files
 */

import { spinABatch, BatchOptions } from "../statistic-runner";
import { Round, Statistic } from "../statistic-calculator";
import { Difficulty } from "sc-slot-board-generator";
import { writeFileSync } from "fs";
import { join } from "path";
import { boardDefinition, commonDefinition } from "../generator-definition";

interface MultiplierSpinData {
  batchId: number;
  roundId: number;
  freeSpinId?: number;
  multiplier: number;
  totalWin: number;
  settlementResult: Round['settlementResult'];
  betAmount: number;
  coinValue: number;
  betLevel: number;
}

interface CollectorResults {
  metadata: {
    totalBatches: number;
    spinsPerBatch: number;
    totalSpins: number;
    spinsWithMultipliers: number;
    generatedAt: string;
  };
  statistics: Statistic[];
  multiplierSpins: MultiplierSpinData[];
  summary: {
    multiplierDistribution: Record<number, number>;
    averageMultiplier: number;
    maxMultiplier: number;
    totalWinFromMultipliers: number;
    multiplierHitRate: number;
  };
}

/**
 * Collects spins that meet the filtering criteria:
 * - Has multiplier value > 0
 * - Settlement has tumbles length >= 2
 * - Settlement has multipliers length >= 2 (in the last tumble)
 */
function collectMultiplierSpins(
  rounds: Round[], 
  statistic: Statistic, 
  batchId: number
): MultiplierSpinData[] {
  const multiplierSpins: MultiplierSpinData[] = [];

  rounds.forEach((round) => {
    // Check if round has a multiplier value
    if (round.multiplier && round.multiplier > 0 && round.settlementResult) {
      const settlement = round.settlementResult;
      
      // Filter 1: Only collect settlements with tumbles length >= 2
      if (!settlement.tumbles || settlement.tumbles.length < 2) {
        return; // Skip this round
      }
      
      // Filter 2: Only collect settlements with multipliers length >= 2 (in the last tumble)
      const lastTumble = settlement.tumbles[settlement.tumbles.length - 1];
      if (!lastTumble.multipliers || lastTumble.multipliers.length < 2) {
        return; // Skip this round
      }
      
      const spinData: MultiplierSpinData = {
        batchId,
        roundId: round.id!,
        freeSpinId: round.freeSpinId,
        multiplier: round.multiplier,
        totalWin: round.betwin || 0,
        settlementResult: settlement,
        betAmount: round.totalAmount!,
        coinValue: round.coinValue!,
        betLevel: round.betLevel!,
      };
      
      multiplierSpins.push(spinData);
    }
  });

  return multiplierSpins;
}

/**
 * Calculates summary statistics for multiplier spins
 */
function calculateMultiplierSummary(multiplierSpins: MultiplierSpinData[], totalSpins: number) {
  if (multiplierSpins.length === 0) {
    return {
      multiplierDistribution: {},
      averageMultiplier: 0,
      maxMultiplier: 0,
      totalWinFromMultipliers: 0,
      multiplierHitRate: 0,
    };
  }

  // Count multiplier distribution
  const multiplierDistribution: Record<number, number> = {};
  let totalMultiplierValue = 0;
  let maxMultiplier = 0;
  let totalWin = 0;

  multiplierSpins.forEach((spin) => {
    // Count distribution
    if (multiplierDistribution[spin.multiplier]) {
      multiplierDistribution[spin.multiplier]++;
    } else {
      multiplierDistribution[spin.multiplier] = 1;
    }

    totalMultiplierValue += spin.multiplier;
    maxMultiplier = Math.max(maxMultiplier, spin.multiplier);
    totalWin += spin.totalWin;
  });

  return {
    multiplierDistribution,
    averageMultiplier: totalMultiplierValue / multiplierSpins.length,
    maxMultiplier,
    totalWinFromMultipliers: totalWin,
    multiplierHitRate: (multiplierSpins.length / totalSpins) * 100,
  };
}

async function main() {
  try {
    console.log("🎰 Starting Multiplier Collector Script...\n");
    
    const numberOfBatches = 5;
    const spinsPerBatch = 100;
    
    // Configure batch options
    const batchOptions: BatchOptions = {
      numberOfRounds: spinsPerBatch,
      coinValue: 0.1, // Default coin value
      betLevel: 1.0,  // Default bet level
      debug: false,   // Set to true for debug output
      multiplierSettings: commonDefinition.multiplier,
      modeSettings: boardDefinition,
      difficulty: Difficulty.Medium,
    };

    console.log(`Starting multiplier collection: ${numberOfBatches} batches × ${spinsPerBatch} spins`);
    console.log(`Batch settings:`, {
      coinValue: batchOptions.coinValue,
      betLevel: batchOptions.betLevel,
      difficulty: batchOptions.difficulty,
    });
    console.log(`\nFiltering criteria:`);
    console.log(`- Only spins with multiplier > 0`);
    console.log(`- Only settlements with tumbles length >= 2`);
    console.log(`- Only settlements with multipliers length >= 2 (in last tumble)`);
    console.log('');

    const allStatistics: Statistic[] = [];
    const allMultiplierSpins: MultiplierSpinData[] = [];
    let totalSpins = 0;

    // Run batches
    for (let batchId = 0; batchId < numberOfBatches; batchId++) {
      console.log(`Running batch ${batchId + 1}/${numberOfBatches}...`);
      
      const { rounds, statistic } = spinABatch(batchOptions);
      
      // Collect multiplier spins from this batch
      const batchMultiplierSpins = collectMultiplierSpins(rounds, statistic, batchId);
      
      allStatistics.push(statistic);
      allMultiplierSpins.push(...batchMultiplierSpins);
      totalSpins += rounds.length;

      console.log(`Batch ${batchId + 1} complete: ${batchMultiplierSpins.length} qualifying spins found (out of ${rounds.length} total spins)`);
    }

    // Calculate summary
    const summary = calculateMultiplierSummary(allMultiplierSpins, totalSpins);

    const results: CollectorResults = {
      metadata: {
        totalBatches: numberOfBatches,
        spinsPerBatch,
        totalSpins,
        spinsWithMultipliers: allMultiplierSpins.length,
        generatedAt: new Date().toISOString(),
      },
      statistics: allStatistics,
      multiplierSpins: allMultiplierSpins,
      summary,
    };

    console.log('\n=== MULTIPLIER COLLECTION RESULTS ===');
    console.log(`Total spins: ${totalSpins}`);
    console.log(`Qualifying spins (with filters): ${allMultiplierSpins.length}`);
    console.log(`Qualification rate: ${summary.multiplierHitRate.toFixed(2)}%`);
    console.log(`Average multiplier: ${summary.averageMultiplier.toFixed(2)}`);
    console.log(`Max multiplier: ${summary.maxMultiplier}`);
    console.log(`Total win from qualifying spins: ${summary.totalWinFromMultipliers.toFixed(2)}`);
    
    if (Object.keys(summary.multiplierDistribution).length > 0) {
      console.log('\nMultiplier distribution:');
      Object.entries(summary.multiplierDistribution)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([multiplier, count]) => {
          console.log(`  ${multiplier}x: ${count} times`);
        });
    }

    // Save results to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `multiplier-spins-${timestamp}.json`;
    const outputPath = join(process.cwd(), 'chain-output', outputFilename);

    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
    
    console.log('\n=== SCRIPT COMPLETED SUCCESSFULLY ===');
    console.log(`Output file: ${outputPath}`);
    
    return results;
  } catch (error) {
    console.error('Script failed:', error);
    throw error;
  }
}

// Run the script - same pattern as generate-chains.ts
main().catch(console.error);
