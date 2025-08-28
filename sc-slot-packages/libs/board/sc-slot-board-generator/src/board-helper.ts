import { equals } from "ramda";
import defaultDefinition from "./default-definition";

export const NO_SYMBOL = -1;
export const SPECIAL_SYMBOL = -2;
export const ZEUS_SCATTER_SYMBOL = 9;
export const MULTIPLIER_ORB_SYMBOL = 10;

export const isNoSymbol = equals(NO_SYMBOL);

export const isMultiplierSymbol = equals(defaultDefinition.multiplier.symbol);

export const isSpecialSymbol = equals(SPECIAL_SYMBOL);

export const isZeusScatter = equals(ZEUS_SCATTER_SYMBOL);

export const isMultiplierOrb = equals(MULTIPLIER_ORB_SYMBOL);
