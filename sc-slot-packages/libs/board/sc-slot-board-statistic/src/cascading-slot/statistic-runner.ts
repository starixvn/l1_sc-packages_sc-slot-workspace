import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
import { prop } from "ramda";
import { CascadingBoardGenerator } from "sc-cascading-slot-base/src/board";
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
  volatility: any;
  betAmounts: { coinValue: number; betLevel: number }[];
  buyFreeSpins: boolean;
}

export interface GetStatisticOptions {
  times: number;
  coinValues: number[];
  betLevels: number[];
  batchOptions: BatchOptions;
}
let count = 1;
const buyFreeSpinSymbols = [0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((symbol) => Array(7).fill(symbol));
const getBuyFreeSpinBoard = (statistic) => {
  const chance = new Chance();

  statistic.buyFreeSpins++;
  return [{ newBoard: chance.shuffle(chance.pickset(buyFreeSpinSymbols, 26).concat([9, 9, 9, 9])), multipliers: [] }];
};

function spin(calculator: RoundCalculator, statistic: Statistic, round: Round, totalMultiplier = 0) {
  const buyFreeSpinBoard = round.buyFreeSpins && !round.freeSpin ? getBuyFreeSpinBoard(statistic) : undefined;

  calculator.processSpinning(round, totalMultiplier, round.betLevel * round.betMultiplier * round.coinValue * 5000, buyFreeSpinBoard);

  calculateStatistic(round)(statistic);

  return round;
}

function executeFreeSpins(
  calculator: RoundCalculator,
  statistic: Statistic,
  round: Round,
  totalMultiplier = 0,
  spins = 0,
  debug = false,
  isFromBuyFreeSpins = false,
  totalExtraSpinsWon = 0
) {
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

    if (freeSpinRound.betwin && freeSpinRound.settlementResult.tumbles.length > 1) {
      multiplier += freeSpinRound.multiplier;
    }

    calculateStatistic(freeSpinRound)(statistic);

    delete freeSpinRound.odds;
    rounds.push(freeSpinRound);

    additionFreeSpins += freeSpinRound.settlementResult.freeSpins.odds;
  }

  if (additionFreeSpins) {
    debug && console.log(`You won addition free spins: ${additionFreeSpins}`);

    // Track total extra free spins if this is from buy free spins
    if (isFromBuyFreeSpins) {
      totalExtraSpinsWon += additionFreeSpins;
    }

    executeFreeSpins(calculator, statistic, round, multiplier, additionFreeSpins, debug, isFromBuyFreeSpins, totalExtraSpinsWon);
  } else if (isFromBuyFreeSpins && totalExtraSpinsWon > 0) {
    // This is the end of a buy free spin session, record the total extra spins won
    if (statistic.buyFreeSpinsExtraSpins[totalExtraSpinsWon]) {
      statistic.buyFreeSpinsExtraSpins[totalExtraSpinsWon]++;
    } else {
      statistic.buyFreeSpinsExtraSpins[totalExtraSpinsWon] = 1;
    }
  }
}

export function spinABatch(options: BatchOptions) {
  const generator = new CascadingBoardGenerator(
    null,
    {
      gameConfigs: {
        cascadingSlotsConfig: {
          multiplierBonus: {
            ...options.multiplierSettings,
          },
          volatility: options.volatility,
        },
      },
    },
    commonDefinition.boardSettings
  );
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
    winExtraFreeSpins: 0,
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
    maxWin: 0,
    hitMaxWin: 0,
    aboveThousandWins: 0,
    winRange: {},
    buyFreeSpins: 0,
    buyFreeSpinsExtraSpins: {},
    baseGameRounds: 0,
    baseGameWins: 0,
    baseGamePayout: 0,
    freeSpinRounds: 0,
    freeSpinWins: 0,
  };
  const betMultiplier = 20;
  for (let i = 0; i < options.numberOfRounds; i++) {
    options.debug && console.log(`Running ${i}/${options.numberOfRounds - 1}`);
    const chance = new Chance();
    const { coinValue, betLevel } = chance.pickone(options.betAmounts);
    const buyFreeSpins = options.buyFreeSpins;

    const round: Round = {
      id: i,
      coinValue,
      betLevel,
      betMultiplier,
      totalAmount: coinValue * betLevel * betMultiplier * (buyFreeSpins ? 50 : 1),
      odds,
      buyFreeSpins,
    };

    spin(calculator, statistic, round, 0);

    rounds.push(Object.assign({}, round, { odds: undefined }));

    let freeSpins = round.settlementResult.freeSpins.odds;

    if (freeSpins) {
      options.debug && console.log(`You won free spins: ${freeSpins}`);

      executeFreeSpins(calculator, statistic, { ...round, totalAmount: 0, buyFreeSpins: false }, 0, freeSpins, options.debug, round.buyFreeSpins, 0);
    }
  }

  return { rounds, statistic };
}

export function getStatistics(options: GetStatisticOptions) {
  const statistics: Statistic[] = [];
  const allRounds: Round[][] = [];
  const betAmounts = options.coinValues.flatMap((coinValue) => options.betLevels.map((betLevel) => ({ betLevel, coinValue })));

  for (let i = 0; i < options.times; i++) {
    const { statistic, rounds } = spinABatch(Object.assign({}, options.batchOptions, betAmounts));

    statistics.push(statistic);
    allRounds.push(rounds);
  }

  return { statistics, rounds: allRounds };
}
