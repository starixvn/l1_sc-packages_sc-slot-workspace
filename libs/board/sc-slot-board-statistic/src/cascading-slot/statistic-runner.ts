import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
import { prop } from "ramda";
import { BoardGenerator } from "sc-slot-board-generator";
import { calculateStatistic, Round, Statistic } from "./statistic-calculator";
import { Chance } from "chance";
import { defaultOdds, commonDefinition } from "./generator-definition";

export interface BatchOptions {
  numberOfRounds: number;
  coinValue: number;
  betLevel: number;
  debug: boolean;
  multiplierSettings: any;
  modeSettings: any;
  difficulty: any;
}

export interface GetStatisticOptions {
  times: number;
  coinValues: number[];
  betLevels: number[];
  batchOptions: BatchOptions;
}

function spin(calculator: RoundCalculator, statistic: Statistic, round: Round, totalMultiplier = 0) {
  calculator.processSpinning(round, totalMultiplier);

  calculateStatistic(round)(statistic);

  return round;
}

function executeFreeSpins(calculator: RoundCalculator, statistic: Statistic, round: Round, totalMultiplier = 0, spins = 0, debug = false) {
  const rounds = [];
  let additionFreeSpins = 0;
  let multiplier = totalMultiplier;

  for (let j = 0; j < spins; j++) {
    debug && console.log(`Running free spins ${j}/${spins - 1}`);

    const freeSpinRound: Round = {
      id: round.id,
      freeSpinId: j,
      coinValue: round.coinValue,
      betLevel: round.betLevel,
      betMultiplier: round.betMultiplier,
      totalAmount: 0,
      odds: round.odds,
      freeSpin: true,
    };

    spin(calculator, statistic, freeSpinRound, multiplier);

    if (freeSpinRound.betwin) {
      multiplier += freeSpinRound.multiplier;
    }

    calculateStatistic(freeSpinRound)(statistic);

    delete freeSpinRound.odds;
    rounds.push(freeSpinRound);

    additionFreeSpins += freeSpinRound.settlementResult.freeSpins.odds;
  }

  if (additionFreeSpins) {
    debug && console.log(`You won addition free spins: ${additionFreeSpins}`);

    executeFreeSpins(calculator, statistic, round, multiplier, additionFreeSpins, debug);
  }
}

export function spinABatch(options: BatchOptions) {
  const generator = new BoardGenerator(commonDefinition.boardSettings, options.multiplierSettings, options.modeSettings, options.difficulty);
  const calculator = new RoundCalculator({
    boardGenerator: generator,
    tumbleCalculator: new TumbleCalculator(),
  });
  const odds = {
    oddsByCounts: Object.assign({}, defaultOdds.normalSymbols.map(prop("payout"))),
    freeSpins: defaultOdds.freeSpins,
  };
  const rounds = [];
  const statistic: Statistic = {
    rtp: 0,
    totalRounds: 0,
    winingRounds: 0,
    totalBetAmount: 0,
    totalPayout: 0,
    totalPayoutForFreeSpins: 0,
    winFreeSpins: 0,
    totalFreeSpins: 0,
    totalAdditionFreeSpins: 0,
    totalMultipliers: 0,
    round: {
      maximumTumbles: 0,
      maximumPayout: 0,
      maximumFreeSpins: 0,
      maximumMultiplier: 0,
      maximumTumblePayout: 0,
    },
    multipliers: {},
    symbols: {
      counts: {},
    },
    cache: {
      freeSpins: {},
    },
  };
  const betMultiplier = 20;

  for (let i = 0; i < options.numberOfRounds; i++) {
    options.debug && console.log(`Running ${i}/${options.numberOfRounds - 1}`);

    const round: Round = {
      id: i,
      coinValue: options.coinValue,
      betLevel: options.betLevel,
      betMultiplier,
      totalAmount: options.coinValue * options.betLevel * betMultiplier,
      odds,
    };

    spin(calculator, statistic, round, 0);

    rounds.push(Object.assign({}, round, { odds: undefined }));

    let freeSpins = round.settlementResult.freeSpins.odds;

    if (freeSpins) {
      options.debug && console.log(`You won free spins: ${freeSpins}`);

      executeFreeSpins(calculator, statistic, round, 0, freeSpins, options.debug);
    }
  }

  return { rounds, statistic };
}

export function getStatistics(options: GetStatisticOptions) {
  const statistics: Statistic[] = [];
  const allRounds: Round[][] = [];
  const betAmounts = options.coinValues.flatMap((coinValue) => options.betLevels.map((betLevel) => ({ betLevel, coinValue })));
  const chance = new Chance();

  for (let i = 0; i < options.times; i++) {
    const betAmount = chance.pickone(betAmounts);

    const { statistic, rounds } = spinABatch(Object.assign({}, options.batchOptions, betAmount));

    statistics.push(statistic);
    allRounds.push(rounds);
  }

  return { statistics, rounds: allRounds };
}
