import { MultiplierGenerator } from "../src/multiplier-generator";

const pickOne = jest.fn();

describe("MultiplierGenerator", () => {
    let multiplierGenerator: MultiplierGenerator;

    beforeEach(() => {
        jest.clearAllMocks();

        multiplierGenerator = new MultiplierGenerator({ min: 2, max: 21 });

        (multiplierGenerator as any)["chance"] = {
            pickone: pickOne,
        };
    });

    describe("randomValue", () => {
        describe("when number of multipliers is 7", () => {
            test.each([
                [0, 2],
                [1, 2],
                [2, 2],
                [3, 3],
                [4, 3],
            ])("should return as expected", (index, expected) => {
                // Arrange
                pickOne.mockImplementationOnce((input: number) => input[index]);

                // Act
                const value = multiplierGenerator.randomValue(7);

                // Assert
                expect(value).toBe(expected);
            });
        });
    });

    describe("generate", () => {
        describe("when number of multipliers is 0", () => {
            it("should return as expected", () => {
                // Arrange
                pickOne
                    .mockImplementationOnce((input: number) => input[20])
                    .mockImplementationOnce((input: number) => input[21])
                    .mockImplementationOnce((input: number) => input[41]);

                // Act
                const multipliers = multiplierGenerator.generate([10, 0, 1, 2, 10, 9, 8, 10]);

                // Assert
                expect(multipliers).toStrictEqual([2, 3, 4]);
            });
        });

        describe("when number of multipliers is 2", () => {
            it("should return as expected", () => {
                // Arrange
                pickOne
                    .mockImplementationOnce((input: number) => input[10])
                    .mockImplementationOnce((input: number) => input[11])
                    .mockImplementationOnce((input: number) => input[21]);

                // Act
                const multipliers = multiplierGenerator.generate([10, 0, 1, 2, 10, 9, 8, 10], 2);

                // Assert
                expect(multipliers).toStrictEqual([2, 3, 4]);
            });
        });
    });

    describe("update", () => {
        describe("when update other min/max value", () => {
            it("the min property should be updated", () => {
                // Act
                multiplierGenerator.update(3, 10);

                // Assert
                expect(multiplierGenerator.getConfig().min).toBe(3);
            });

            it("the max property should be updated", () => {
                // Act
                multiplierGenerator.update(3, 10);

                // Assert
                expect(multiplierGenerator.getConfig().max).toBe(10);
            });
        });
    });

    describe("getConfig", () => {
        it("should return current min value", () => {
            // Act
            const result = multiplierGenerator.getConfig();

            // Assert
            expect(result.min).toBe(2);
        });

        it("should return current max value", () => {
            // Act
            const result = multiplierGenerator.getConfig();

            // Assert
            expect(result.max).toBe(21);
        });
    });
});
