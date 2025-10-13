import { compose, countBy, last, length, map, max, mean, partialRight, path, prop, range, split, subtract, __ } from "ramda";

export interface Round {
  id?: number;
  freeSpinId?: number;
  totalAmount?: number;
  betwin?: number;
  freeSpin?: boolean;
  coinValue?: number;
  betLevel?: number;
  betMultiplier?: number;
  multiplier?: number;
  odds?: any;
  totalTumbleWin?: number;
  buyFreeSpins?: boolean;
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
}

export interface Statistic {
  totalRounds: number;
  winingRounds: number;
  totalBetAmount: number;
  totalPayout: number;
  totalPayoutForFreeSpins: number;
  totalFreeSpins: number;
  totalAdditionFreeSpins: number;
  totalMultipliers: number;
  rtp: number;
  winFreeSpins: number;
  winExtraFreeSpins: number;
  multipliers: Record<number, number>;
  maxWin: number;
  hitMaxWin: number;
  aboveThousandWins: number;
  winRange: Record<number, number>;

  round: {
    maximumTumbles: number;
    maximumPayout: number;
    maximumFreeSpins: number;
    maximumMultiplier: number;
    maximumTumblePayout: number;
  };

  symbols: {
    counts: Record<number, Record<number, number>>;
  };
  cache: any;
  buyFreeSpins: number;
  buyFreeSpinsExtraSpins: Record<number, number>;
  baseGameRounds: number;
  baseGameWins: number;
  baseGamePayout: number;
  freeSpinRounds: number;
  freeSpinWins: number;
}

export const calculateCommonProperties =
  (round: Round) =>
  (statistic: Statistic): Statistic => {
    const betAmount = round.betLevel * round.coinValue * round.betMultiplier;

    if (statistic.maxWin < round.betwin / betAmount) {
      statistic.maxWin = round.betwin / betAmount;
      statistic.hitMaxWin = 0;
    }

    statistic.totalRounds += 1;
    statistic.winingRounds += round.betwin > 0 ? 1 : 0;
    statistic.totalBetAmount += round.totalAmount;
    statistic.totalPayout += round.betwin;
    statistic.totalPayoutForFreeSpins += round.freeSpin ? round.betwin : 0;
    statistic.totalFreeSpins += round.settlementResult.freeSpins.odds;
    statistic.totalAdditionFreeSpins += round.freeSpin ? round.settlementResult.freeSpins.odds : 0;
    statistic.rtp = statistic.totalPayout / (statistic.totalBetAmount || 1);
    statistic.totalMultipliers += compose(length, prop("multipliers") as any, last)(round.settlementResult.tumbles);
    statistic.winFreeSpins += !round.freeSpin && round.settlementResult.freeSpins.odds ? 1 : 0;
    statistic.winExtraFreeSpins += round.freeSpin && round.settlementResult.freeSpins.odds ? 1 : 0;
    statistic.maxWin = max(statistic.maxWin, round.betwin / betAmount);
    statistic.hitMaxWin += round.betwin / betAmount === statistic.maxWin ? 1 : 0;
    statistic.aboveThousandWins += round.betwin / betAmount > 1000 ? 1 : 0;

    // Track base game vs free spins separately
    if (round.freeSpin) {
      statistic.freeSpinRounds += 1;
      statistic.freeSpinWins += round.betwin > 0 ? 1 : 0;
    } else {
      statistic.baseGameRounds += 1;
      statistic.baseGameWins += round.betwin > 0 ? 1 : 0;
      statistic.baseGamePayout += round.betwin;
    }

    return statistic;
  };

export const calculateRoundProperty =
  (round: Round) =>
  (statistic: Statistic): Statistic => {
    statistic.round.maximumTumbles = max(statistic.round.maximumTumbles, round.settlementResult.tumbles.length);
    statistic.round.maximumPayout = max(statistic.round.maximumPayout, round.betwin);
    statistic.round.maximumMultiplier = max(statistic.round.maximumMultiplier, round.multiplier);
    statistic.round.maximumTumblePayout = max(statistic.round.maximumTumblePayout, round.totalTumbleWin);

    if (round.settlementResult.freeSpins.odds) {
      if (statistic.cache.freeSpins[round.id]) {
        statistic.cache.freeSpins[round.id] += round.settlementResult.freeSpins.odds;
      } else {
        statistic.cache.freeSpins[round.id] = round.settlementResult.freeSpins.odds;
      }
    }

    statistic.round.maximumFreeSpins = Math.max(...(Object.values(statistic.cache.freeSpins) as number[])) || 0;

    return statistic;
  };

export const calculateWinRange =
  (round: Round) =>
  (statistic: Statistic): Statistic => {
    const winRange = Math.ceil(round.betwin / (round.betLevel * round.coinValue * round.betMultiplier));
    statistic.winRange[winRange] = (statistic.winRange[winRange] || 0) + 1;
    return statistic;
  };

export const countWinningSymbols =
  (round: Round) =>
  (statistic: Statistic): Statistic => {
    const counts = map<any, number>(compose<any, any, any, any>(countBy(parseInt), split(","), prop("originalBoard")))(
      round.settlementResult.tumbles
    );

    counts.forEach((count) =>
      Object.entries(count).forEach(([symbol, value]) => {
        if (statistic.symbols.counts[symbol]) {
          if (statistic.symbols.counts[symbol][value]) {
            statistic.symbols.counts[symbol][value] += 1;
          } else {
            statistic.symbols.counts[symbol][value] = 1;
          }
        } else {
          statistic.symbols.counts[symbol] = {
            [value]: 1,
          };
        }
      })
    );

    return statistic;
  };

export const countMultiplierValues =
  (round: Round) =>
  (statistic: Statistic): Statistic => {
    if (statistic.multipliers[round.multiplier]) {
      statistic.multipliers[round.multiplier] += 1;
    } else {
      statistic.multipliers[round.multiplier] = 1;
    }

    return statistic;
  };

export const calculateStatistic = (round: Round) =>
  compose(
    calculateCommonProperties(round),
    calculateRoundProperty(round),
    countWinningSymbols(round),
    countMultiplierValues(round),
    calculateWinRange(round)
  );

export const variance = (input: number[]) => {
  const square_error = compose(partialRight(Math.pow, [2]), subtract(__, mean(input)));

  return compose(mean, map(square_error))(input);
};

export const getValues = (properties: string[], statistics: Statistic[]) => map(path(properties) as (a: any) => number, statistics);

export const getPercents = (properties: string[], statistics: Statistic[], size: number) => map((x) => x / size, getValues(properties, statistics));

export const getPercentsByIndividualRounds = (properties: string[], statistics: Statistic[]) =>
  statistics.map((statistic, index) => {
    const value = path(properties, statistic) as number;
    return value / statistic.totalRounds;
  });

export const calculateRTP = (statistics: Statistic[], rounds: number) => {
  const totalBaseGameRounds = statistics.reduce((acc, stat) => acc + stat.baseGameRounds, 0);
  const totalBaseGameWins = statistics.reduce((acc, stat) => acc + stat.baseGameWins, 0);
  const totalBaseGamePayout = statistics.reduce((acc, stat) => acc + stat.baseGamePayout, 0);
  const totalFreeSpinRounds = statistics.reduce((acc, stat) => acc + stat.freeSpinRounds, 0);
  const totalFreeSpinWins = statistics.reduce((acc, stat) => acc + stat.freeSpinWins, 0);
  const totalFreeSpinPayout = statistics.reduce((acc, stat) => acc + stat.totalPayoutForFreeSpins, 0);

  const baseGameHitFrequency = totalBaseGameRounds > 0 ? totalBaseGameWins / totalBaseGameRounds : 0;
  const freeSpinHitFrequency = totalFreeSpinRounds > 0 ? totalFreeSpinWins / totalFreeSpinRounds : 0;
  const freeSpinEfficiency = baseGameHitFrequency > 0 ? freeSpinHitFrequency / baseGameHitFrequency : 0;

  const avgBaseGameWin = totalBaseGameRounds > 0 ? totalBaseGamePayout / totalBaseGameRounds : 0;
  const avgFreeSpinWin = totalFreeSpinRounds > 0 ? totalFreeSpinPayout / totalFreeSpinRounds : 0;
  const freeSpinPayoutMultiplier = avgBaseGameWin > 0 ? avgFreeSpinWin / avgBaseGameWin : 0;

  return {
    rtp: mean(getValues(["rtp"], statistics)),
    rtps: getValues(["rtp"], statistics),
    rtpDeviation: Math.sqrt(variance(getValues(["rtp"], statistics))),
    multiplierRatio: mean(getPercentsByIndividualRounds(["totalMultipliers"], statistics)),
    freeSpinsRatio: mean(getPercentsByIndividualRounds(["winFreeSpins"], statistics)),
    extraFreeSpinsRatio: mean(getPercentsByIndividualRounds(["winExtraFreeSpins"], statistics)),
    tumbleWinRatio: mean(getPercentsByIndividualRounds(["winingRounds"], statistics)),
    maxWin: Math.max(...getValues(["maxWin"], statistics)),
    hitMaxWin: mean(getPercentsByIndividualRounds(["hitMaxWin"], statistics)),
    aboveThousandWins: mean(getPercentsByIndividualRounds(["aboveThousandWins"], statistics)),
    totalBuyFreeSpins: statistics.reduce((acc, stat) => acc + stat.buyFreeSpins, 0),
    totalPayoutForFreeSpins: totalFreeSpinPayout,
    baseGameHitFrequency,
    freeSpinHitFrequency,
    freeSpinEfficiency,
    avgBaseGameWin,
    avgFreeSpinWin,
    freeSpinPayoutMultiplier,
    totalBaseGameRounds,
    totalFreeSpinRounds,
  };
};

export const countSymbols = (statistics: Statistic[]): Record<number, Record<number, number>> => {
  const result: Record<number, number[]> = {};

  range(0, 11).forEach((symbol) => {
    range(1, 31).forEach((numberOfSymbols) => {
      statistics.forEach((statistic) => {
        if (!result[symbol]) {
          result[symbol] = range(1, 31).map(() => 0);
        }

        const count = (statistic.symbols.counts[symbol] && statistic.symbols.counts[symbol][numberOfSymbols]) || 0;

        result[symbol][numberOfSymbols - 1] += count;
      });
    });
  });

  return result;
};

export const countMultipliers = (statistics: Statistic[]): Record<number, number> => {
  const result: Record<number, number> = {};
  const maximumMultiplier = Math.max(
    ...map(
      parseInt,
      statistics.flatMap((s) => Object.keys(s.multipliers))
    )
  );

  range(0, maximumMultiplier + 1).forEach((value) => {
    statistics.forEach((statistic) => {
      if (!result[value]) {
        result[value] = statistic.multipliers[value] || 0;
      } else {
        result[value] += statistic.multipliers[value] || 0;
      }
    });
  });

  return result;
};

export const countBuyFreeSpinsExtraSpins = (statistics: Statistic[]): Record<number, number> => {
  const result: Record<number, number> = {};

  statistics.forEach((statistic) => {
    Object.entries(statistic.buyFreeSpinsExtraSpins || {}).forEach(([extraSpins, count]) => {
      const extraSpinsNum = parseInt(extraSpins);
      if (!result[extraSpinsNum]) {
        result[extraSpinsNum] = count;
      } else {
        result[extraSpinsNum] += count;
      }
    });
  });

  return result;
};
