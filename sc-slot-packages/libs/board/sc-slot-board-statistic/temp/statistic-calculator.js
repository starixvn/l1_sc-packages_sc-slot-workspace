import { compose, countBy, last, length, map, max, mean, partialRight, path, prop, range, split, subtract, __ } from "ramda";
export const calculateCommonProperties = (round) => (statistic) => {
    statistic.totalRounds += 1;
    statistic.winingRounds += round.betwin > 0 ? 1 : 0;
    statistic.totalBetAmount += round.totalAmount;
    statistic.totalPayout += round.betwin;
    statistic.totalPayoutForFreeSpins += round.freeSpin ? round.betwin : 0;
    statistic.totalFreeSpins += round.settlementResult.freeSpins.odds;
    statistic.totalAdditionFreeSpins += round.freeSpin ? round.settlementResult.freeSpins.odds : 0;
    statistic.rtp = statistic.totalPayout / (statistic.totalBetAmount || 1);
    statistic.totalMultipliers += compose(length, prop("multipliers"), last)(round.settlementResult.tumbles);
    statistic.winFreeSpins += round.settlementResult.freeSpins.odds ? 1 : 0;
    return statistic;
};
export const calculateRoundProperty = (round) => (statistic) => {
    statistic.round.maximumTumbles = max(statistic.round.maximumTumbles, round.settlementResult.tumbles.length);
    statistic.round.maximumPayout = max(statistic.round.maximumPayout, round.betwin);
    statistic.round.maximumMultiplier = max(statistic.round.maximumMultiplier, round.multiplier);
    statistic.round.maximumTumblePayout = max(statistic.round.maximumTumblePayout, round.totalTumbleWin);
    if (round.settlementResult.freeSpins.odds) {
        if (statistic.cache.freeSpins[round.id]) {
            statistic.cache.freeSpins[round.id] += round.settlementResult.freeSpins.odds;
        }
        else {
            statistic.cache.freeSpins[round.id] = round.settlementResult.freeSpins.odds;
        }
    }
    statistic.round.maximumFreeSpins = Math.max(...Object.values(statistic.cache.freeSpins)) || 0;
    return statistic;
};
export const countWinningSymbols = (round) => (statistic) => {
    const counts = map(compose(countBy(parseInt), split(","), prop("originalBoard")))(round.settlementResult.tumbles);
    counts.forEach((count) => Object.entries(count).forEach(([symbol, value]) => {
        if (statistic.symbols.counts[symbol]) {
            if (statistic.symbols.counts[symbol][value]) {
                statistic.symbols.counts[symbol][value] += 1;
            }
            else {
                statistic.symbols.counts[symbol][value] = 1;
            }
        }
        else {
            statistic.symbols.counts[symbol] = {
                [value]: 1,
            };
        }
    }));
    return statistic;
};
export const countMultiplierValues = (round) => (statistic) => {
    if (statistic.multipliers[round.multiplier]) {
        statistic.multipliers[round.multiplier] += 1;
    }
    else {
        statistic.multipliers[round.multiplier] = 1;
    }
    return statistic;
};
export const calculateStatistic = (round) => compose(calculateCommonProperties(round), calculateRoundProperty(round), countWinningSymbols(round), countMultiplierValues(round));
export const variance = (input) => {
    const square_error = compose(partialRight(Math.pow, [2]), subtract(__, mean(input)));
    return compose(mean, map(square_error))(input);
};
export const getValues = (properties, statistics) => map(path(properties), statistics);
export const getPercents = (properties, statistics, size) => map((x) => x / size, getValues(properties, statistics));
export const calculateRTP = (statistics, rounds) => ({
    rtp: mean(getValues(["rtp"], statistics)),
    rtpDeviation: Math.sqrt(variance(getValues(["rtp"], statistics))),
    multiplierRatio: mean(getPercents(["totalMultipliers"], statistics, rounds)),
    freeSpinsRatio: mean(getPercents(["winFreeSpins"], statistics, rounds)),
    tumbleWinRatio: mean(getPercents(["winingRounds"], statistics, rounds)),
});
export const countSymbols = (statistics) => {
    const result = {};
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
export const countMultipliers = (statistics) => {
    const result = {};
    const maximumMultiplier = Math.max(...map(parseInt, statistics.flatMap((s) => Object.keys(s.multipliers))));
    range(0, maximumMultiplier + 1).forEach((value) => {
        statistics.forEach((statistic) => {
            if (!result[value]) {
                result[value] = statistic.multipliers[value] || 0;
            }
            else {
                result[value] += statistic.multipliers[value] || 0;
            }
        });
    });
    return result;
};
