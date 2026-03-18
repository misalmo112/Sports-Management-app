/**
 * Tests for validation utilities
 */
import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateURL,
  validateStep1,
  validateStep2,
  validateStep3,
  validateAgeCategories,
  validateStep4,
  validateStep5,
} from '../validation';

describe('validateEmail', () => {
  it('validates correct email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('validateURL', () => {
  it('validates correct URLs', () => {
    expect(validateURL('https://example.com')).toBe(true);
    expect(validateURL('http://test.com/path')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(validateURL('not-a-url')).toBe(false);
    expect(validateURL('http://')).toBe(false);
  });

  it('allows empty URLs (optional field)', () => {
    expect(validateURL('')).toBe(true);
  });
});

describe('validateStep1', () => {
  it('validates correct profile data', () => {
    const data = {
      name: 'Test Academy',
      email: 'test@example.com',
      phone: '+1 555 012 3456',
      address_line1: '123 Main St',
      timezone: 'America/New_York',
      currency: 'USD',
    };
    
    const errors = validateStep1(data);
    expect(errors).toHaveLength(0);
  });

  it('requires name', () => {
    const data = {
      email: 'test@example.com',
      timezone: 'America/New_York',
      currency: 'USD',
    };
    
    const errors = validateStep1(data);
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('requires email', () => {
    const data = {
      name: 'Test Academy',
      timezone: 'America/New_York',
      currency: 'USD',
    };
    
    const errors = validateStep1(data);
    expect(errors.some(e => e.field === 'email')).toBe(true);
  });

  it('requires timezone', () => {
    const data = {
      name: 'Test Academy',
      email: 'test@example.com',
      currency: 'USD',
    };
    
    const errors = validateStep1(data);
    expect(errors.some(e => e.field === 'timezone')).toBe(true);
  });

  it('requires currency', () => {
    const data = {
      name: 'Test Academy',
      email: 'test@example.com',
      timezone: 'America/New_York',
    };

    const errors = validateStep1(data);
    expect(errors.some(e => e.field === 'currency')).toBe(true);
  });

  it('validates email format', () => {
    const data = {
      name: 'Test Academy',
      email: 'invalid-email',
      timezone: 'America/New_York',
      currency: 'USD',
    };
    
    const errors = validateStep1(data);
    expect(errors.some(e => e.field === 'email' && e.message.includes('valid email'))).toBe(true);
  });
});

describe('validateStep2', () => {
  it('validates correct locations data', () => {
    const data = {
      locations: [
        { name: 'Main Location' },
      ],
    };
    
    const errors = validateStep2(data);
    expect(errors).toHaveLength(0);
  });

  it('requires at least one location', () => {
    const data = {
      locations: [],
    };
    
    const errors = validateStep2(data);
    expect(errors.some(e => e.field === 'locations')).toBe(true);
  });

  it('requires location name', () => {
    const data = {
      locations: [
        { name: '' },
      ],
    };
    
    const errors = validateStep2(data);
    expect(errors.some(e => e.field.includes('name'))).toBe(true);
  });

  it('requires unique location names', () => {
    const data = {
      locations: [
        { name: 'Location 1' },
        { name: 'Location 1' },
      ],
    };
    
    const errors = validateStep2(data);
    expect(errors.some(e => e.message.includes('unique'))).toBe(true);
  });
});

describe('validateStep3', () => {
  it('validates correct sports data', () => {
    const data = {
      sports: [
        { name: 'Soccer', age_min: 5, age_max: 18 },
      ],
    };
    
    const errors = validateStep3(data);
    expect(errors).toHaveLength(0);
  });

  it('requires at least one sport', () => {
    const data = {
      sports: [],
    };
    
    const errors = validateStep3(data);
    expect(errors.some(e => e.field === 'sports')).toBe(true);
  });

  it('validates age_max > age_min', () => {
    const data = {
      sports: [
        { name: 'Soccer', age_min: 10, age_max: 5 },
      ],
    };
    
    const errors = validateStep3(data);
    expect(errors.some(e => e.message.includes('greater'))).toBe(true);
  });
});

describe('validateStep4', () => {
  it('validates correct terms data', () => {
    const data = {
      terms: [{ name: 'Fall 2024', start_date: '2024-09-01', end_date: '2024-12-15' }],
    };
    
    const errors = validateStep4(data);
    expect(errors).toHaveLength(0);
  });

  it('requires end_date after start_date', () => {
    const data = {
      terms: [{ name: 'Fall 2024', start_date: '2024-12-15', end_date: '2024-09-01' }],
    };
    
    const errors = validateStep4(data);
    expect(errors.some(e => e.message.includes('after start date'))).toBe(true);
  });
});

describe('validateStep5', () => {
  it('validates correct pricing data', () => {
    const data = {
      pricing_items: [
        { name: 'Monthly', duration_type: 'MONTHLY', duration_value: 1, price: 99.99, currency: 'USD' },
      ],
    };
    
    const errors = validateStep5(data);
    expect(errors).toHaveLength(0);
  });

  it('requires valid duration_type', () => {
    const data = {
      pricing_items: [
        { name: 'Monthly', duration_type: 'INVALID', duration_value: 1, price: 99.99, currency: 'USD' },
      ],
    };
    
    const errors = validateStep5(data);
    expect(errors.some(e => e.message.includes('Duration type'))).toBe(true);
  });

  it('requires positive price', () => {
    const data = {
      pricing_items: [
        { name: 'Monthly', duration_type: 'MONTHLY', duration_value: 1, price: -10, currency: 'USD' },
      ],
    };
    
    const errors = validateStep5(data);
    expect(errors.some(e => e.field.includes('price'))).toBe(true);
  });
});

describe('validateAgeCategories', () => {
  it('validates correct age categories data', () => {
    const data = {
      age_categories: [{ name: 'U8', age_min: 5, age_max: 7 }],
    };
    
    const errors = validateAgeCategories(data);
    expect(errors).toHaveLength(0);
  });

  it('requires age_min and age_max', () => {
    const data = {
      age_categories: [{ name: 'U8' }],
    };
    
    const errors = validateAgeCategories(data);
    expect(errors.length).toBeGreaterThan(0);
  });
});
