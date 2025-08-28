import { equals, reverse } from "ramda";
import { shuffleN, replace, replaceEach } from "../src/utils";

describe("utils", () => {
    describe("shuffleN", () => {
        describe("when pass the reverse method as a shuffle method", () => {
            it("should return as expected", () => {
                // Act
                const result = shuffleN(reverse, 2, [1, 2, 3]);

                // Assert
                expect(result).toStrictEqual([1, 2, 3]);
            });
        });
    });

    describe("replace", () => {
        describe("when called", () => {
            it("should return as expected", () => {
                // Act
                const result = replace(equals(1), 2, [1, 2, 3, 2, 1]);

                // Assert
                expect(result).toStrictEqual([2, 2, 3, 2, 2]);
            });
        });
    });

    describe("replaceEach", () => {
        describe("when length of replacement list equals to replacement items", () => {
            it("should replace all", () => {
                // Act
                const result = replaceEach(equals(1), [4, 5], [1, 2, 3, 2, 1]);

                // Assert
                expect(result).toStrictEqual([4, 2, 3, 2, 5]);
            });
        });

        describe("when length of replacement list is less than replacement items", () => {
            it("should replace a part of the list", () => {
                // Act
                const result = replaceEach(equals(1), [4], [1, 2, 3, 2, 1]);

                // Assert
                expect(result).toStrictEqual([4, 2, 3, 2, 1]);
            });
        });
    });
});
