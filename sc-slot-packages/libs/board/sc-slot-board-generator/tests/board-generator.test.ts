import { clone } from "ramda";
import { BoardGenerator } from "../src/board-generator";
import defaultDefinition from "../src/default-definition";
import boardDefinition from "../src/board-definition";
import { Difficulty } from "../src/difficulties";
import { NO_SYMBOL } from "../src/board-helper";

describe("BoardGenerator", () => {
    let boardGenerator: BoardGenerator;

    beforeEach(() => {
        jest.clearAllMocks();

        const definition = clone(defaultDefinition) as any;
        const clonedBoardDefinition = clone(boardDefinition);

        clonedBoardDefinition.mode[Difficulty.Medium] = {
            0: 30,
        } as any;

        boardGenerator = new BoardGenerator(definition.boardSettings, definition.multiplier, clonedBoardDefinition, Difficulty.Medium);
    });

    describe("constructor", () => {
        describe("when call without parameter", () => {
            it("should create an instance with default configs", () => {
                // Act
                const generator = new BoardGenerator(
                    defaultDefinition.boardSettings,
                    defaultDefinition.multiplier,
                    boardDefinition,
                    Difficulty.Medium
                );

                // Assert
                expect(generator).toBeDefined();
            });
        });
    });

    describe("getDifficulty", () => {
        it("should return value as expected", () => {
            // Act
            const actual = boardGenerator.getDifficulty();

            // Assert
            expect(actual).toBe(Difficulty.Medium);
        });
    });

    describe("setDifficulty", () => {
        it("should change the difficulty of this board", () => {
            // Act
            boardGenerator.setDifficulty(Difficulty.Easy);

            // Assert
            expect(boardGenerator.getDifficulty()).toBe(Difficulty.Easy);
        });
    });

    describe("getMultiplierConfig", () => {
        it("should return current multiplier config", () => {
            // Arrange
            const expected = { min: defaultDefinition.multiplier.min, max: defaultDefinition.multiplier.max };

            // Act
            const result = boardGenerator.getMultiplierConfig();

            // Assert
            expect(result).toStrictEqual(defaultDefinition.multiplier);
        });
    });

    describe("updateMultiplierConfig", () => {
        it("should return current new multiplier config", () => {
            // Arrange
            const expected = { min: 3, max: 40, symbol: defaultDefinition.multiplier.symbol };

            // Act
            boardGenerator.updateMultiplierConfig(expected.min, expected.max);

            // Assert
            const result = boardGenerator.getMultiplierConfig();
            expect(result).toStrictEqual(expected);
        });
    });

    describe("generate", () => {
        it("return total symbols as defined", () => {
            // Act
            const result = boardGenerator.generate();

            // Assert
            expect(result.newBoard.length).toEqual(defaultDefinition.boardSettings.reels * defaultDefinition.boardSettings.symbolsOnReel);
        });
    });

    describe("explodeAndRefill", () => {
        it("return new board with the same total of symbols", () => {
            // Arrange
            const board = boardGenerator.generate();

            // Act
            const result = boardGenerator.explodeAndRefill(board.newBoard, [2], []);

            // Assert
            expect(result.newBoard.length).toEqual(defaultDefinition.boardSettings.reels * defaultDefinition.boardSettings.symbolsOnReel);
        });

        it("return new board without NoSymbol", () => {
            // Arrange
            const board = boardGenerator.generate();

            // Act
            const result = boardGenerator.explodeAndRefill(board.newBoard, [2], []);

            // Assert
            expect(result.newBoard.indexOf(NO_SYMBOL) === -1).toBe(true);
        });

        it("return exploded symbols corresponding with board", () => {
            // Arrange
            const board = [8, 8, 8, 2, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];
            const expected = [8, 8, 8, -1, -1, -1, 8, 8, -1, -1, -1, -1, 8, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 8, -1, -1];

            // Act
            const result = boardGenerator.explodeAndRefill(board, [8], []);

            // Assert
            expect(result.explodedSymbols?.join(",")).toBe(expected.join(","));
        });

        it("return new symbols corresponding with board", () => {
            // Arrange
            const board = [8, 8, 8, 2, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];
            const expected = [0, 0, 0, -1, -1, -1, 0, 0, -1, -1, -1, -1, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, -1, -1, -1, -1, -1];

            // Act
            const result = boardGenerator.explodeAndRefill(board, [8], []);

            // Assert
            expect(result.newSymbols).toStrictEqual(expected);
        });

        it("return new multipliers corresponding with board", () => {
            // Arrange
            const board = [8, 8, 8, 2, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];

            boardGenerator.getSymbolGenerator = () =>
                ({
                    randomSymbols: () => [0, 0, 10, 0, 0, 10, 0, 0],
                } as any);

            (boardGenerator as any).multiplierGenerator.generate = () => [3, 4];

            // Act
            const result = boardGenerator.explodeAndRefill(board, [8], [1, 2]);

            // Assert
            expect(result.multipliers).toStrictEqual([3, 1, 4, 2]);
        });

        describe("using setRefillSymbols", () => {
            it("return new symbols corresponding with board", () => {
                // Arrange
                const board = [8, 8, 8, 2, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];
                const expected = [1, 2, 3, -1, -1, -1, 4, 5, -1, -1, -1, -1, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 10, -1, -1, -1, -1, -1];
                const refillSymbols = [1, 2, 3, 4, 5, 6, 7, 10];

                boardGenerator.setRefillSymbols(refillSymbols, []);

                // Act
                const result = boardGenerator.explodeAndRefill(board, [8], [2]);

                // Assert
                expect(result.newSymbols).toStrictEqual(expected);
            });

            it("return new multipliers corresponding with board", () => {
                // Arrange
                const board = [8, 8, 8, 2, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];
                const refillSymbols = [1, 2, 3, 4, 5, 6, 7, 10];

                boardGenerator.setRefillSymbols(refillSymbols, [4]);

                // Act
                const result = boardGenerator.explodeAndRefill(board, [8], [2, 3]);

                // Assert
                expect(result.multipliers).toStrictEqual([2, 3, 4]);
            });
        });
    });

    describe("collapse", () => {
        it("return new board with the same total of symbols", () => {
            // Arrange
            const board = [-1, 8, 8, 2, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];

            // Act
            const result = boardGenerator.collapse(board);

            // Assert
            expect(result.length).toEqual(board.length);
        });

        it("return result corresponding with board", () => {
            // Arrange
            const board = [8, -1, 8, -1, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];
            const expected = [-1, -1, 8, 8, 2, 1, 8, 8, 4, 3, 1, 10, 8, 8, 10, 2, 1, 5, 3, 9, 9, 5, 6, 4, 9, 5, 7, 8, 1, 2];

            // Act
            const result = boardGenerator.collapse(board);

            // Assert
            expect(result).toStrictEqual(expected);
        });
    });
});
