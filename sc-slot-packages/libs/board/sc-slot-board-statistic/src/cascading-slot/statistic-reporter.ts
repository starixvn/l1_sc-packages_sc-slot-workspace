import { GetStatisticOptions, getStatistics } from "./statistic-runner";
import { commonDefinition } from "./generator-definition";
import { range, __ } from "ramda";
import { Difficulty } from "sc-slot-board-generator";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { calculateRTP, countMultipliers, countSymbols } from "./statistic-calculator";

function getSymbolHeuristic(multiplierSymbols: number) {
  return {
    0: 1.2,
    1: 10 / 9,
    2: 1.2,
    3: 1.25,
    4: 1.2,
    5: 1.25,
    6: 1.25,
    7: 2,
    8: 1,
    9: 2 / 3,
    10: multiplierSymbols,
  };
}

function getNumberOfSymbols(factor: number, multiplierSymbols: number) {
  const symbolHeuristic = getSymbolHeuristic(multiplierSymbols);
  const multiplier = { 10: symbolHeuristic[10] };
  const scatter = { 9: Math.round(factor * symbolHeuristic[9]) };
  const normalSymbols = range(0, 9)
    .reverse()
    .reduce((result, symbol) => {
      if (symbol === 8) {
        result[symbol] = factor * symbolHeuristic[symbol];
      } else {
        result[symbol] = Math.round(symbolHeuristic[symbol] * result[symbol + 1]);
      }

      return result;
    }, {} as Record<number, number>);

  return Object.assign({}, normalSymbols, scatter, multiplier);
}

function getRunnerOptions(
  factor: number,
  multiplierSymbols: number,
  batchSize: number = 1000,
  times: number = 2,
  coinValues = [0.1],
  betLevels = [5]
): GetStatisticOptions {
  const numberOfSymbols = getNumberOfSymbols(factor, multiplierSymbols);

  return {
    betLevels,
    coinValues,
    times,
    batchOptions: {
      betLevel: 5,
      coinValue: 0.1,
      debug: false,
      difficulty: Difficulty.Easy,
      multiplierSettings: commonDefinition.multiplier,
      modeSettings: {
        mode: {
          [Difficulty.Easy]: numberOfSymbols,
        },
      },
      numberOfRounds: batchSize,
    },
  };
}

function generateReportWithSingleFactor(
  factor: number,
  multiplierSymbols: number,
  batchSize: number = 1000,
  times: number = 2,
  coinValues = [0.1],
  betLevels = [5]
) {
  const options = getRunnerOptions(factor, multiplierSymbols, batchSize, times, coinValues, betLevels);
  const { statistics } = getStatistics(options);
  const report = calculateRTP(statistics, batchSize);
  const symbols = countSymbols(statistics);
  const configs = range(0, 11).map((symbol) => options.batchOptions.modeSettings.mode[Difficulty.Easy][symbol]);
  const multipliers = countMultipliers(statistics);

  return { report, symbols, configs, multipliers };
}

function generateReport(
  maximumFactor: number,
  multiplierSymbols: number,
  batchSize: number = 1000,
  times: number = 2,
  betCoins = [0.1],
  betLevels = [5],
  singleFactor: boolean = false
) {
  console.log({ maximumFactor, multiplierSymbols, batchSize, times });
  const result = [];

  if (singleFactor) {
    const data = generateReportWithSingleFactor(maximumFactor, multiplierSymbols, batchSize, times, betCoins, betLevels);

    result.push(data);
  } else {
    for (let factor = 12; factor <= maximumFactor; factor++) {
      const data = generateReportWithSingleFactor(factor, multiplierSymbols, batchSize, times, betCoins, betLevels);

      result.push(data);

      console.log(data.report, data.configs);

      writeFileSync(`reports/report-${batchSize}-${times}-${maximumFactor}-${multiplierSymbols}.json`, JSON.stringify(result, null, 2));
    }
  }

  writeFileSync(`reports/report-${batchSize}-${times}-${maximumFactor}-${multiplierSymbols}.json`, JSON.stringify(result, null, 2));

  return result;
}

const factor = Number(process.argv[2] || 40);
const multiplier = Number(process.argv[3] || 1);
const batchSize = Number(process.argv[4] || 1000);
const times = Number(process.argv[5] || 50);
const singleFactor = process.argv[6] === "true";
const betCoins = [0.01, 0.05, 0.1, 0.5];
const betLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

!existsSync("reports") && mkdirSync("reports");
generateReport(factor, multiplier, batchSize, times, betCoins, betLevels, singleFactor);
