import { both, clone, complement, concat, count, flatten, includes, isEmpty, isNil, map, pipe, reject, repeat, splitEvery, __ } from "ramda";

import boardDefinition from "./board-definition";
import { Difficulty } from "./difficulties";
import { MultiplierGenerator, MultiplierConfig } from "./multiplier-generator";
import SymbolsGenerator from "./symbols-generator";
import { replace, replaceEach } from "./utils";
import { isMultiplierSymbol, isNoSymbol, isSpecialSymbol, NO_SYMBOL, SPECIAL_SYMBOL } from "./board-helper";

export interface IBoard {
    newBoard: number[];
    explodedSymbols?: number[];
    newSymbols?: number[];
    multipliers: number[];
}

export interface BoardSettings {
    reels: number;
    symbolsOnReel: number;
    numberOfSymbols: number;
    numberOfShuffles: number;
}

export class BoardGenerator {
    private readonly settings: BoardSettings;
    private readonly definition: any;
    private readonly multiplierGenerator: MultiplierGenerator;

    private difficulty: Difficulty;

    private refillSymbols: number[];
    private refillMultipliers: number[];

    constructor(settings: BoardSettings, multiplierConfig: MultiplierConfig, definition: any = null, difficulty: Difficulty) {
        this.definition = definition ?? boardDefinition;
        this.difficulty = difficulty ?? Difficulty.Medium;
        this.settings = settings;

        this.multiplierGenerator = new MultiplierGenerator(multiplierConfig);
    }

    setDifficulty(difficulty: Difficulty): void {
        this.difficulty = difficulty;
    }

    getDifficulty(): Difficulty {
        return this.difficulty;
    }

    updateMultiplierConfig(min: number, max: number): void {
        this.multiplierGenerator.update(min, max);
    }

    getMultiplierConfig(): MultiplierConfig {
        return this.multiplierGenerator.getConfig();
    }

    generate(): IBoard {
        const generator = this.getSymbolGenerator();
        const board = generator.randomSymbols(this.settings.reels * this.settings.symbolsOnReel);

        return {
            newBoard: board,
            multipliers: this.multiplierGenerator.generate(board),
        };
    }

    explodeAndRefill(board: number[], winSymbols: number[], oldMultipliers: number[]): IBoard {
        const isWinningSymbol = includes(__, winSymbols);

        const numberOfNewSymbols = count(isWinningSymbol, board);
        const newSymbols = this.getRefillSymbols(numberOfNewSymbols);

        const exploded = replace(complement(isWinningSymbol), NO_SYMBOL, board);
        const remained = replace(isWinningSymbol, NO_SYMBOL, board);
        const collapsed = this.collapse(remained);

        const filled = this.arrangeRefilledSymbols(collapsed, newSymbols);
        const multipliers = this.arrangeMultiplierSymbols(collapsed, newSymbols, oldMultipliers);
        const newBoard = replaceEach(isNoSymbol, newSymbols, collapsed);

        return {
            newBoard: newBoard,
            explodedSymbols: exploded,
            newSymbols: filled,
            multipliers: multipliers,
        };
    }

    getSymbolGenerator(): SymbolsGenerator {
        return new SymbolsGenerator(this.definition.mode[this.difficulty], this.settings.numberOfShuffles);
    }

    collapse(board: number[]): number[] {
        const symbolsOnReel = this.settings.symbolsOnReel;

        const getReels = splitEvery(symbolsOnReel);
        const collapseReel = (reel: number[]) => this.collapseReel(reel);
        const collapseBoard = pipe<number[][], number[][], number[][], number[]>(getReels, map(collapseReel), flatten);

        return collapseBoard(board);
    }

    protected arrangeRefilledSymbols(collapsed: number[], newSymbols: number[]) {
        const replaceNormalSymbolBySpecialOne = replace(complement(isNoSymbol), SPECIAL_SYMBOL);
        const filled = pipe<number[][], number[], number[], number[]>(
            replaceNormalSymbolBySpecialOne,
            replaceEach(isNoSymbol, newSymbols),
            replace(isSpecialSymbol, NO_SYMBOL)
        );

        return filled(collapsed);
    }

    protected arrangeMultiplierSymbols(collapsed: number[], newSymbols: number[], oldMultiplierValues: number[]) {
        const newMultiplierValues = this.getMultiplierValues(newSymbols, oldMultiplierValues);

        const oldMultiplierValueBoard = this.arrangeMultiplierValueToBoard(collapsed, oldMultiplierValues);
        const newMultiplierValueBoard = this.arrangeMultiplierValueToBoard(newSymbols, newMultiplierValues);

        const mergedMultiplierValueBoard = replaceEach(isNoSymbol, newMultiplierValueBoard, oldMultiplierValueBoard);

        return reject(isSpecialSymbol, mergedMultiplierValueBoard);
    }

    protected collapseReel(reel: number[]): number[] {
        const removeNoSymbolInList = reject<number>(isNoSymbol);
        const fillNoSymbols = (list: number[]) => repeat(NO_SYMBOL, this.settings.symbolsOnReel - list.length);
        const prependNoSymbolToList = (list: number[]) => concat(fillNoSymbols(list), list);
        const collapseReel = pipe(removeNoSymbolInList, prependNoSymbolToList);

        return collapseReel(reel);
    }

    arrangeMultiplierValueToBoard(board: number[], multiplierValues: number[]): number[] {
        const isNotMultiplierSymbolAndNoSymbol = both(complement(isMultiplierSymbol), complement(isNoSymbol));
        const replaceBySpecialSymbol = replace(isNotMultiplierSymbolAndNoSymbol, SPECIAL_SYMBOL);

        return pipe<number[][], number[], number[]>(replaceBySpecialSymbol, replaceEach(isMultiplierSymbol, multiplierValues))(board);
    }

    setRefillSymbols(symbols: number[], multipliers: number[]) {
        !isEmpty(symbols) && (this.refillSymbols = symbols);
        !isEmpty(multipliers) && (this.refillMultipliers = multipliers);
    }

    getMultiplierValues(board: number[], oldMultipliers: number[]) {
        if (isNil(this.refillMultipliers) || isEmpty(this.refillMultipliers)) {
            return this.multiplierGenerator.generate(board, oldMultipliers.length);
        } else {
            const multipliers = clone(this.refillMultipliers);

            this.refillMultipliers = [];

            return multipliers;
        }
    }

    getRefillSymbols(size: number): number[] {
        if (isNil(this.refillSymbols) || isEmpty(this.refillSymbols)) {
            return this.getSymbolGenerator().randomSymbols(size);
        } else {
            const symbols = clone(this.refillSymbols);

            this.refillSymbols = [];

            return symbols;
        }
    }
}
