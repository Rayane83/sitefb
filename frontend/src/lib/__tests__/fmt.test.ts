import { describe, it, expect } from 'vitest';
import { 
  formatCurrency, 
  formatCurrencyDollar, 
  parseNumber, 
  calculateFromPaliers,
  isValidNumber
} from '../fmt';
import { parseClipboardDotationData } from '../export';

describe('fmt utilities', () => {
  describe('formatCurrency', () => {
    it('should format Euro currency correctly', () => {
      expect(formatCurrency(1000)).toBe('1 000 €');
      expect(formatCurrency(1234.56)).toBe('1 235 €');
      expect(formatCurrency(0)).toBe('0 €');
    });
  });

  describe('formatCurrencyDollar', () => {
    it('should format dollar amounts correctly', () => {
      expect(formatCurrencyDollar(1000)).toBe('1 000 $');
      expect(formatCurrencyDollar(1234.56)).toBe('1 235 $');
      expect(formatCurrencyDollar(0)).toBe('0 $');
    });
  });

  describe('parseNumber', () => {
    it('should parse French formatted numbers', () => {
      expect(parseNumber('1 000')).toBe(1000);
      expect(parseNumber('1,5')).toBe(1.5);
      expect(parseNumber('1 234,56')).toBe(1234.56);
      expect(parseNumber('0')).toBe(0);
      expect(parseNumber('')).toBe(0);
      expect(parseNumber('invalid')).toBe(0);
    });
  });

  describe('isValidNumber', () => {
    it('should validate numbers correctly', () => {
      expect(isValidNumber('123')).toBe(true);
      expect(isValidNumber('123.45')).toBe(true);
      expect(isValidNumber('1 234')).toBe(true);
      expect(isValidNumber('1,5')).toBe(true);
      expect(isValidNumber('abc')).toBe(false);
      expect(isValidNumber('')).toBe(false);
    });
  });
});

describe('calculateFromPaliers', () => {
  const testPaliers = [
    {
      min: 0,
      max: 50000,
      sal_min_emp: 2500,
      sal_max_emp: 3500,
      sal_min_pat: 4000,
      sal_max_pat: 5500,
      pr_min_emp: 500,
      pr_max_emp: 1000,
      pr_min_pat: 1000,
      pr_max_pat: 2000,
    },
    {
      min: 50001,
      max: 100000,
      sal_min_emp: 3500,
      sal_max_emp: 5000,
      sal_min_pat: 5500,
      sal_max_pat: 7500,
      pr_min_emp: 1000,
      pr_max_emp: 2000,
      pr_min_pat: 2000,
      pr_max_pat: 3500,
    },
  ];

  it('should calculate correctly for employee in first bracket', () => {
    const result = calculateFromPaliers(25000, testPaliers, false);
    expect(result.salaire).toBe(3000); // Middle of 2500-3500 range
    expect(result.prime).toBe(750); // Middle of 500-1000 range
  });

  it('should calculate correctly for patron in first bracket', () => {
    const result = calculateFromPaliers(25000, testPaliers, true);
    expect(result.salaire).toBe(4750); // Middle of 4000-5500 range
    expect(result.prime).toBe(1500); // Middle of 1000-2000 range
  });

  it('should handle minimum values (bottom of bracket)', () => {
    const result = calculateFromPaliers(0, testPaliers, false);
    expect(result.salaire).toBe(2500);
    expect(result.prime).toBe(500);
  });

  it('should handle maximum values (top of bracket)', () => {
    const result = calculateFromPaliers(50000, testPaliers, false);
    expect(result.salaire).toBe(3500);
    expect(result.prime).toBe(1000);
  });

  it('should handle values above highest bracket', () => {
    const result = calculateFromPaliers(150000, testPaliers, false);
    expect(result.salaire).toBe(5000); // Max from highest bracket
    expect(result.prime).toBe(2000);
  });

  it('should handle empty paliers array', () => {
    const result = calculateFromPaliers(50000, [], false);
    expect(result.salaire).toBe(0);
    expect(result.prime).toBe(0);
  });
});

describe('parseClipboardDotationData', () => {
  it('should parse tab-separated data correctly', () => {
    const input = 'Jean Dupont\t15000\t8000\t12000\nMarie Martin\t22000\t15000\t18000';
    const result = parseClipboardDotationData(input);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'Jean Dupont',
      run: 15000,
      facture: 8000,
      vente: 12000,
      ca_total: 35000
    });
    expect(result[1]).toEqual({
      name: 'Marie Martin',
      run: 22000,
      facture: 15000,
      vente: 18000,
      ca_total: 55000
    });
  });

  it('should parse semicolon-separated data correctly', () => {
    const input = 'Jean Dupont;15000;8000;12000\nMarie Martin;22000;15000;18000';
    const result = parseClipboardDotationData(input);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Jean Dupont');
    expect(result[0].ca_total).toBe(35000);
  });

  it('should parse comma-separated data correctly', () => {
    const input = 'Jean Dupont,15000,8000,12000';
    const result = parseClipboardDotationData(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jean Dupont');
    expect(result[0].ca_total).toBe(35000);
  });

  it('should handle incomplete data gracefully', () => {
    const input = 'Jean Dupont\t15000\t8000\nMarie Martin\t22000';
    const result = parseClipboardDotationData(input);
    
    expect(result).toHaveLength(1); // Only complete row
    expect(result[0].name).toBe('Jean Dupont');
  });

  it('should handle invalid numbers', () => {
    const input = 'Jean Dupont\tabc\t8000\t12000';
    const result = parseClipboardDotationData(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].run).toBe(0);
    expect(result[0].ca_total).toBe(20000); // 0 + 8000 + 12000
  });
});