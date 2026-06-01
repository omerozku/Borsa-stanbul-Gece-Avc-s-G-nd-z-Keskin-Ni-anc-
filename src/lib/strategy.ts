/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RSI, EMA } from 'technicalindicators';

export interface StockData {
  symbol: string;
  peak: number;
  dip: number;
}

export function calculateFibonacciLevels(peak: number, dip: number) {
  const diff = peak - dip;
  return {
    level100: peak,
    level786: dip + diff * 0.786,
    level618: dip + diff * 0.618,
    level500: dip + diff * 0.5,
    level382: dip + diff * 0.382,
    level236: dip + diff * 0.236,
    level0: dip,
  };
}

export function calculateRSI(prices: number[], period: number = 14): number {
  const rsiValues = RSI.calculate({ values: prices, period });
  return rsiValues[rsiValues.length - 1] || 0;
}

export function calculateEMA(prices: number[], period: number): number {
  const emaValues = EMA.calculate({ values: prices, period });
  return emaValues[emaValues.length - 1] || 0;
}
