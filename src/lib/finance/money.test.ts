import { describe, it, expect } from 'vitest';
import {
  parseToPaise,
  paiseToRupeString,
  formatINR,
} from './money';

describe('parseToPaise', () => {
  it('parses valid rupee strings to integer paise', () => {
    expect(parseToPaise('1234.5')).toBe(123450);
    expect(parseToPaise('1,234.50')).toBe(123450);
    expect(parseToPaise('0')).toBe(0);
    expect(parseToPaise('-12.3')).toBe(-1230);
    expect(parseToPaise('-0.5')).toBe(-50);
    expect(parseToPaise('0.1')).toBe(10);
  });

  it('returns null for invalid input', () => {
    expect(parseToPaise('')).toBeNull();
    expect(parseToPaise('abc')).toBeNull();
    expect(parseToPaise('1.234')).toBeNull();
    expect(parseToPaise('12.345')).toBeNull();
  });

  it('avoids floating-point drift', () => {
    expect(parseToPaise('0.1')! + parseToPaise('0.2')!).toBe(30);
  });
});

describe('paiseToRupeString', () => {
  it('formats integer paise as a two-decimal rupee string', () => {
    expect(paiseToRupeString(123456)).toBe('1234.56');
    expect(paiseToRupeString(-5)).toBe('-0.05');
    expect(paiseToRupeString(0)).toBe('0.00');
  });

  it('throws for non-integer paise', () => {
    expect(() => paiseToRupeString(1.5)).toThrow(RangeError);
  });
});

describe('formatINR', () => {
  it('matches Intl en-IN INR currency output', () => {
    const expected = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(1234.56);

    expect(formatINR(123456)).toBe(expected);
  });
});