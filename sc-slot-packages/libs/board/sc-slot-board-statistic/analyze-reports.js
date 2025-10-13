import { readAllReports } from "./read-reports.js";
import fs from "fs";

const DISPLAY_PERCENTAGES_AS = "percentage"; // "percentage" or "decimal"
const OUTPUT_FILE = "analysis-report.json";

/**
 * Calculate comprehensive statistics from reports
 */
function generateComprehensiveAnalysis(allReports) {
  if (allReports.length === 0) {
    return { error: "No reports found" };
  }

  const report = allReports[0].data.report;
  const totalBet = report.totalBet || 0;
  const totalPayout = report.totalPayout || 0;
  const totalPayoutForFreeSpins = report.totalPayoutForFreeSpins || 0;

  // Calculate base game and bonus mode RTP
  const baseGamePayout = totalPayout - totalPayoutForFreeSpins;
  const baseGameRTP = totalBet > 0 ? baseGamePayout / totalBet : 0;
  const bonusModeRTP = totalBet > 0 ? totalPayoutForFreeSpins / totalBet : 0;
  const totalRTP = report.rtp || 0;

  // Calculate volatility (using standard deviation)
  const rtpStdDev = report.rtpDeviation || 0;
  const rtpMean = report.rtp || 0;
  const coefficientOfVariation = rtpMean > 0 ? rtpStdDev / rtpMean : 0;

  // Volatility classification based on CV
  let volatilityRating;
  if (coefficientOfVariation < 0.02) {
    volatilityRating = "Very Low";
  } else if (coefficientOfVariation < 0.04) {
    volatilityRating = "Low";
  } else if (coefficientOfVariation < 0.06) {
    volatilityRating = "Medium";
  } else if (coefficientOfVariation < 0.08) {
    volatilityRating = "High";
  } else {
    volatilityRating = "Very High";
  }

  // Max Win and Frequency
  const maxWin = report.maxWin || 0;
  const maxWinFrequency = report.hitMaxWin || 0;

  // Free Spin/Bonus Frequency
  const freeSpinFrequency = report.freeSpinsRatio || 0;
  const extraFreeSpinFrequency = report.extraFreeSpinsRatio || 0;

  // Win 100x Bet Frequency - need to calculate from statistics
  // Since we don't have direct access to winRange, we'll use aboveThousandWins as a proxy
  const win100xFrequency = report.aboveThousandWins || 0;

  // Hit Frequency (winning rounds ratio)
  const hitFrequency = report.tumbleWinRatio || 0;

  // Feature Hit Frequency (free spins trigger)
  const featureHitFrequency = freeSpinFrequency;

  // Buy Free Spins statistics
  const totalBuyFreeSpins = report.totalBuyFreeSpins || 0;

  // Multiplier statistics
  const multiplierFrequency = report.multiplierRatio || 0;

  // Free Spins Efficiency
  const baseGameHitFrequency = report.baseGameHitFrequency || 0;
  const freeSpinHitFrequency = report.freeSpinHitFrequency || 0;
  const freeSpinEfficiency = report.freeSpinEfficiency || 0;
  const avgBaseGameWin = report.avgBaseGameWin || 0;
  const avgFreeSpinWin = report.avgFreeSpinWin || 0;
  const freeSpinPayoutMultiplier = report.freeSpinPayoutMultiplier || 0;
  const totalBaseGameRounds = report.totalBaseGameRounds || 0;
  const totalFreeSpinRounds = report.totalFreeSpinRounds || 0;

  // Format values based on display preference
  const formatValue = (value) => {
    if (DISPLAY_PERCENTAGES_AS === "percentage") {
      return `${(value * 100).toFixed(4)}%`;
    }
    return value.toFixed(6);
  };

  const formatFrequency = (value) => {
    if (DISPLAY_PERCENTAGES_AS === "percentage") {
      return `${(value * 100).toFixed(4)}%`;
    }
    return value.toFixed(6);
  };

  const analysis = {
    reportInfo: {
      totalReports: allReports.length,
      reportFile: allReports[0].filename,
      totalRounds: Math.round(totalBet / (report.rtp || 1)),
      totalBet: totalBet.toFixed(2),
      totalPayout: totalPayout.toFixed(2),
    },
    rtpAnalysis: {
      totalRTP: formatValue(totalRTP),
      baseGameRTP: formatValue(baseGameRTP),
      bonusModeRTP: formatValue(bonusModeRTP),
      rtpDeviation: formatValue(rtpStdDev),
      rtpRange: {
        min: formatValue(Math.min(...report.rtps)),
        max: formatValue(Math.max(...report.rtps)),
      },
    },
    volatility: {
      rating: volatilityRating,
      coefficientOfVariation: coefficientOfVariation.toFixed(6),
      standardDeviation: rtpStdDev.toFixed(6),
    },
    maxWinAnalysis: {
      maxWin: `${maxWin.toFixed(2)}x`,
      maxWinFrequency: formatFrequency(maxWinFrequency),
      maxWinPerRound: `1 in ${maxWinFrequency > 0 ? Math.round(1 / maxWinFrequency) : "N/A"}`,
    },
    frequencyAnalysis: {
      hitFrequency: formatFrequency(hitFrequency),
      hitRate: `1 in ${hitFrequency > 0 ? (1 / hitFrequency).toFixed(2) : "N/A"}`,
      freeSpinTriggerFrequency: formatFrequency(featureHitFrequency),
      freeSpinTriggerRate: `1 in ${featureHitFrequency > 0 ? (1 / featureHitFrequency).toFixed(2) : "N/A"}`,
      extraFreeSpinFrequency: formatFrequency(extraFreeSpinFrequency),
      multiplierFrequency: formatFrequency(multiplierFrequency),
      win100xBetFrequency: formatFrequency(win100xFrequency),
      win100xBetRate: `1 in ${win100xFrequency > 0 ? Math.round(1 / win100xFrequency) : "N/A"}`,
    },
    bonusFeatures: {
      totalBuyFreeSpins: totalBuyFreeSpins,
      buyFreeSpinsPercentage: formatValue(totalBuyFreeSpins / Math.round(totalBet / (report.rtp || 1))),
    },
    freeSpinsEfficiency: {
      baseGameHitFrequency: formatFrequency(baseGameHitFrequency),
      baseGameHitRate: `1 in ${baseGameHitFrequency > 0 ? (1 / baseGameHitFrequency).toFixed(2) : "N/A"}`,
      freeSpinHitFrequency: formatFrequency(freeSpinHitFrequency),
      freeSpinHitRate: `1 in ${freeSpinHitFrequency > 0 ? (1 / freeSpinHitFrequency).toFixed(2) : "N/A"}`,
      efficiencyRatio: `${freeSpinEfficiency.toFixed(2)}x`,
      avgBaseGameWin: avgBaseGameWin.toFixed(4),
      avgFreeSpinWin: avgFreeSpinWin.toFixed(4),
      payoutMultiplier: `${freeSpinPayoutMultiplier.toFixed(2)}x`,
      totalBaseGameRounds: totalBaseGameRounds,
      totalFreeSpinRounds: totalFreeSpinRounds,
    },
  };

  return analysis;
}

/**
 * Generate a formatted console report
 */
function printFormattedReport(analysis) {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║           CASCADING SLOT STATISTICAL ANALYSIS               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("📊 REPORT INFORMATION");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Report File:    ${analysis.reportInfo.reportFile}`);
  console.log(`Total Rounds:   ${analysis.reportInfo.totalRounds.toLocaleString()}`);
  console.log(`Total Bet:      ${analysis.reportInfo.totalBet}`);
  console.log(`Total Payout:   ${analysis.reportInfo.totalPayout}`);

  console.log("\n💰 RTP ANALYSIS (Return to Player)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Total RTP:      ${analysis.rtpAnalysis.totalRTP}`);
  console.log(`Base Game RTP:  ${analysis.rtpAnalysis.baseGameRTP}`);
  console.log(`Bonus Mode RTP: ${analysis.rtpAnalysis.bonusModeRTP}`);
  console.log(`RTP Deviation:  ${analysis.rtpAnalysis.rtpDeviation}`);
  console.log(`RTP Range:      ${analysis.rtpAnalysis.rtpRange.min} - ${analysis.rtpAnalysis.rtpRange.max}`);

  console.log("\n📈 VOLATILITY");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Volatility:     ${analysis.volatility.rating}`);
  console.log(`Coefficient:    ${analysis.volatility.coefficientOfVariation}`);
  console.log(`Std Deviation:  ${analysis.volatility.standardDeviation}`);

  console.log("\n🎯 MAX WIN");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Max Win:        ${analysis.maxWinAnalysis.maxWin}`);
  console.log(`Max Win Freq:   ${analysis.maxWinAnalysis.maxWinFrequency}`);
  console.log(`Max Win Rate:   ${analysis.maxWinAnalysis.maxWinPerRound} rounds`);

  console.log("\n🎲 FREQUENCY ANALYSIS");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Hit Frequency:          ${analysis.frequencyAnalysis.hitFrequency}`);
  console.log(`Hit Rate:               ${analysis.frequencyAnalysis.hitRate} rounds`);
  console.log(`Feature Hit Frequency:  ${analysis.frequencyAnalysis.freeSpinTriggerFrequency}`);
  console.log(`Feature Hit Rate:       ${analysis.frequencyAnalysis.freeSpinTriggerRate} rounds`);
  console.log(`Extra Free Spin Freq:   ${analysis.frequencyAnalysis.extraFreeSpinFrequency}`);
  console.log(`Multiplier Frequency:   ${analysis.frequencyAnalysis.multiplierFrequency}`);
  console.log(`Win 100x Bet Freq:      ${analysis.frequencyAnalysis.win100xBetFrequency}`);
  console.log(`Win 100x Bet Rate:      ${analysis.frequencyAnalysis.win100xBetRate} rounds`);

  console.log("\n🎁 BONUS FEATURES");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Total Buy Free Spins:   ${analysis.bonusFeatures.totalBuyFreeSpins.toLocaleString()}`);
  console.log(`Buy Free Spins Rate:    ${analysis.bonusFeatures.buyFreeSpinsPercentage}`);

  console.log("\n🚀 FREE SPINS EFFICIENCY");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Base Game Rounds:       ${analysis.freeSpinsEfficiency.totalBaseGameRounds.toLocaleString()}`);
  console.log(`Free Spins Rounds:      ${analysis.freeSpinsEfficiency.totalFreeSpinRounds.toLocaleString()}`);
  console.log("");
  console.log(`Base Game Hit Freq:     ${analysis.freeSpinsEfficiency.baseGameHitFrequency}`);
  console.log(`Base Game Hit Rate:     ${analysis.freeSpinsEfficiency.baseGameHitRate} rounds`);
  console.log(`Free Spins Hit Freq:    ${analysis.freeSpinsEfficiency.freeSpinHitFrequency}`);
  console.log(`Free Spins Hit Rate:    ${analysis.freeSpinsEfficiency.freeSpinHitRate} rounds`);
  console.log(`Efficiency Ratio:       ${analysis.freeSpinsEfficiency.efficiencyRatio}`);
  console.log("");
  console.log(`Avg Base Game Win:      ${analysis.freeSpinsEfficiency.avgBaseGameWin}`);
  console.log(`Avg Free Spin Win:      ${analysis.freeSpinsEfficiency.avgFreeSpinWin}`);
  console.log(`Payout Multiplier:      ${analysis.freeSpinsEfficiency.payoutMultiplier}`);

  console.log("\n═══════════════════════════════════════════════════════════════\n");
}

// Main execution
console.log("🔍 Analyzing Reports...\n");

const allReports = readAllReports();

if (allReports.length > 0) {
  const analysis = generateComprehensiveAnalysis(allReports);

  if (analysis.error) {
    console.error("❌ Error:", analysis.error);
  } else {
    printFormattedReport(analysis);

    // Save to JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysis, null, 2));
    console.log(`✅ Analysis saved to ${OUTPUT_FILE}\n`);
  }
} else {
  console.log("❌ No reports found or error occurred");
}
