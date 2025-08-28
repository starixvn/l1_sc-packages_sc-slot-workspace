import { Chance } from "chance";
import { filter, flatten, map, max, pipe, range, repeat } from "ramda";
import { isMultiplierSymbol } from "./board-helper";

export interface MultiplierConfig {
    min: number;
    max: number;
}

export class MultiplierGenerator {
    private readonly chance: Chance.Chance;
    private readonly config: MultiplierConfig;

    constructor(config: MultiplierConfig) {
        this.config = config;

        this.chance = new Chance();
    }

    protected generateSetOfValues(min: number, max: number): number[] {
        const repeatValue = (value: number) => repeat(value, max - value + min);
        const generateSetOfValues = pipe<number[], number[], number[][], number[]>(range, map(repeatValue), flatten);

        return generateSetOfValues(min, max + 1);
    }

    randomValue(multipliers: number) {
        const maximumValue = max(Math.round(this.config.max / max(multipliers, 1)), this.config.min);
        const values = this.generateSetOfValues(this.config.min, maximumValue);
        const value = this.chance.pickone(values);

        return max(value, this.config.min);
    }

    generate(board: number[], numberOfMultipliers = 0): number[] {
        const getMultiplierSymbols = filter<number>(isMultiplierSymbol);
        const getRandomValue = () => this.randomValue(numberOfMultipliers);

        return pipe(getMultiplierSymbols, map(getRandomValue))(board);
    }

    update(min: number, max: number) {
        this.config.min = min;
        this.config.max = max;
    }

    getConfig(): MultiplierConfig {
        return this.config;
    }
}
