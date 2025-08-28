import { Difficulty } from "sc-slot-board-generator";

export const commonDefinition = {
  multiplier: {
    symbol: 10,
    min: 2,
    max: 21,
  },
  boardSettings: {
    reels: 6,
    symbolsOnReel: 5,
    numberOfSymbols: 11,
    numberOfShuffles: 3,
  },
};

export const boardDefinition = {
  mode: {
    [Difficulty.Hard]: {
      0: 193,
      1: 161,
      2: 145,
      3: 121,
      4: 97,
      5: 81,
      6: 65,
      7: 52,
      8: 26,
      9: 17,
      10: 2,
    },
    [Difficulty.Medium]: {
      0: 176,
      1: 147,
      2: 132,
      3: 110,
      4: 88,
      5: 73,
      6: 58,
      7: 46,
      8: 23,
      9: 15,
      10: 2,
    },
    [Difficulty.Easy]: {
      0: 158,
      1: 132,
      2: 119,
      3: 99,
      4: 79,
      5: 66,
      6: 53,
      7: 42,
      8: 21,
      9: 14,
      10: 3,
    },
    [Difficulty.Trial]: {
      0: 152,
      1: 127,
      2: 114,
      3: 95,
      4: 76,
      5: 63,
      6: 50,
      7: 40,
      8: 20,
      9: 13,
      10: 3,
    },
  },
};

export const defaultOdds = {
  normalSymbols: [
    {
      symbol: 0,
      payout: [
        { from: 8, to: 9, odds: 5 },
        { from: 10, to: 11, odds: 15 },
        { from: 12, to: 30, odds: 40 },
      ],
    },
    {
      symbol: 1,
      payout: [
        { from: 8, to: 9, odds: 8 },
        { from: 10, to: 11, odds: 18 },
        { from: 12, to: 30, odds: 80 },
      ],
    },
    {
      symbol: 2,
      payout: [
        { from: 8, to: 9, odds: 10 },
        { from: 10, to: 11, odds: 20 },
        { from: 12, to: 30, odds: 100 },
      ],
    },
    {
      symbol: 3,
      payout: [
        { from: 8, to: 9, odds: 16 },
        { from: 10, to: 11, odds: 24 },
        { from: 12, to: 30, odds: 160 },
      ],
    },
    {
      symbol: 4,
      payout: [
        { from: 8, to: 9, odds: 20 },
        { from: 10, to: 11, odds: 30 },
        { from: 12, to: 30, odds: 200 },
      ],
    },
    {
      symbol: 5,
      payout: [
        { from: 8, to: 9, odds: 30 },
        { from: 10, to: 11, odds: 40 },
        { from: 12, to: 30, odds: 240 },
      ],
    },
    {
      symbol: 6,
      payout: [
        { from: 8, to: 9, odds: 40 },
        { from: 10, to: 11, odds: 100 },
        { from: 12, to: 30, odds: 300 },
      ],
    },
    {
      symbol: 7,
      payout: [
        { from: 8, to: 9, odds: 50 },
        { from: 10, to: 11, odds: 200 },
        { from: 12, to: 30, odds: 500 },
      ],
    },
    {
      symbol: 8,
      payout: [
        { from: 8, to: 9, odds: 200 },
        { from: 10, to: 11, odds: 500 },
        { from: 12, to: 30, odds: 1000 },
      ],
    },
  ],
  freeSpins: {
    symbol: 9,
    initialOdds: [
      { count: 4, odds: 3 },
      { count: 5, odds: 6 },
      { count: 6, odds: 18 },
    ],
    additionalOdds: [{ count: 4, odds: 5 }],
  },
};
