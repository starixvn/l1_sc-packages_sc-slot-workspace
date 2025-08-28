import SymbolsGenerator from "../src/symbols-generator";

describe("Symbols", () => {
    const numberOfSymbols = {
        0: 1,
        1: 2,
        2: 3,
        3: 4,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("return total symbols as defined", () => {
            // Act
            const symbols = new SymbolsGenerator(numberOfSymbols);

            // Assert
            expect(symbols.getBoard().length).toEqual(10);
        });
    });

    describe("getSymbols", () => {
        it("return set of symbols", () => {
            // Arrange
            const symbols = new SymbolsGenerator(numberOfSymbols);

            // Act
            const randomSymbols = symbols.randomSymbols(3);

            // Assert
            expect(randomSymbols).toHaveLength(3);
        });
    });
});
