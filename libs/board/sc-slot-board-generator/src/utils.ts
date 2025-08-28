import { append, clone, curry, reduce, repeat } from "ramda";

export function shuffleN<T>(shuffle: (a: T[]) => T[], times: number, input: T[]) {
    return reduce((result, fn: (a: T[]) => T[]) => fn(result), input, repeat(shuffle, times));
}

function replaceInternal(truly: (a: any) => boolean, replacement: any, input: any[]): any[] {
    return reduce((result, element) => append(truly(element) ? replacement : element, result), [] as any[], input);
}

function replaceEachInternal(truly: (a: any) => boolean, replacements: any[], input: any[]): any[] {
    const result = clone(input);
    let replacementIndex = 0;

    for (let i = 0; i < input.length; i++) {
        if (truly(input[i]) && replacements[replacementIndex] !== undefined) {
            result[i] = replacements[replacementIndex];
            replacementIndex++;
        }
    }

    return result;
}

export const replace = curry(replaceInternal);
export const replaceEach = curry(replaceEachInternal);
