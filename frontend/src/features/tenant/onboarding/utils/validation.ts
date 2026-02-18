/**
 * Client-side validation helpers for onboarding steps
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const validateURL = (url: string): boolean => {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate Step 1: Academy Profile
 */
export const validateStep1 = (data: {
  name?: string;
  email?: string;
  timezone?: string;
  currency?: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (data.name.length > 255) {
    errors.push({ field: 'name', message: 'Name must be 255 characters or less' });
  }

  if (!data.email || data.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Enter a valid email address' });
  }

  if (!data.timezone || data.timezone.trim().length === 0) {
    errors.push({ field: 'timezone', message: 'Timezone is required' });
  }

  if (!data.currency || data.currency.trim().length === 0) {
    errors.push({ field: 'currency', message: 'Currency is required' });
  } else if (data.currency.length !== 3) {
    errors.push({ field: 'currency', message: 'Currency must be a 3-character code (e.g., USD)' });
  }

  if (data.email && data.email.length > 255) {
    errors.push({ field: 'email', message: 'Email must be 255 characters or less' });
  }

  return errors;
};

/**
 * Validate Step 2: Locations
 */
export const validateStep2 = (data: {
  locations?: Array<{ name?: string }>;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.locations || data.locations.length === 0) {
    errors.push({ field: 'locations', message: 'At least one location is required' });
    return errors;
  }

  const names = new Set<string>();
  data.locations.forEach((location, index) => {
    if (!location.name || location.name.trim().length === 0) {
      errors.push({ field: `locations[${index}].name`, message: 'Location name is required' });
    } else if (location.name.length > 255) {
      errors.push({ field: `locations[${index}].name`, message: 'Location name must be 255 characters or less' });
    } else if (names.has(location.name)) {
      errors.push({ field: `locations[${index}].name`, message: 'Location names must be unique' });
    } else {
      names.add(location.name);
    }
  });

  return errors;
};

/**
 * Validate Step 3: Sports
 */
export const validateStep3 = (data: {
  sports?: Array<{ name?: string; age_min?: number; age_max?: number }>;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.sports || data.sports.length === 0) {
    errors.push({ field: 'sports', message: 'At least one sport is required' });
    return errors;
  }

  const names = new Set<string>();
  data.sports.forEach((sport, index) => {
    if (!sport.name || sport.name.trim().length === 0) {
      errors.push({ field: `sports[${index}].name`, message: 'Sport name is required' });
    } else if (sport.name.length > 255) {
      errors.push({ field: `sports[${index}].name`, message: 'Sport name must be 255 characters or less' });
    } else if (names.has(sport.name)) {
      errors.push({ field: `sports[${index}].name`, message: 'Sport names must be unique' });
    } else {
      names.add(sport.name);
    }

    if (sport.age_min !== undefined && sport.age_min < 0) {
      errors.push({ field: `sports[${index}].age_min`, message: 'Age min must be 0 or greater' });
    }

    if (sport.age_max !== undefined && sport.age_min !== undefined && sport.age_max <= sport.age_min) {
      errors.push({ field: `sports[${index}].age_max`, message: 'Age max must be greater than age min' });
    }
  });

  return errors;
};

/**
 * Validate Step 4: Age Categories
 */
export const validateStep4 = (data: {
  age_categories?: Array<{ name?: string; age_min?: number; age_max?: number }>;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.age_categories || data.age_categories.length === 0) {
    errors.push({ field: 'age_categories', message: 'At least one age category is required' });
    return errors;
  }

  const names = new Set<string>();
  data.age_categories.forEach((category, index) => {
    if (!category.name || category.name.trim().length === 0) {
      errors.push({ field: `age_categories[${index}].name`, message: 'Age category name is required' });
    } else if (category.name.length > 255) {
      errors.push({ field: `age_categories[${index}].name`, message: 'Age category name must be 255 characters or less' });
    } else if (names.has(category.name)) {
      errors.push({ field: `age_categories[${index}].name`, message: 'Age category names must be unique' });
    } else {
      names.add(category.name);
    }

    if (category.age_min === undefined || category.age_min < 0) {
      errors.push({ field: `age_categories[${index}].age_min`, message: 'Age min is required and must be 0 or greater' });
    }

    if (category.age_max === undefined) {
      errors.push({ field: `age_categories[${index}].age_max`, message: 'Age max is required' });
    } else if (category.age_min !== undefined && category.age_max <= category.age_min) {
      errors.push({ field: `age_categories[${index}].age_max`, message: 'Age max must be greater than age min' });
    }
  });

  return errors;
};

/**
 * Validate Step 5: Terms
 */
export const validateStep5 = (data: {
  terms?: Array<{ name?: string; start_date?: string; end_date?: string }>;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.terms || data.terms.length === 0) {
    errors.push({ field: 'terms', message: 'At least one term is required' });
    return errors;
  }

  data.terms.forEach((term, index) => {
    if (!term.name || term.name.trim().length === 0) {
      errors.push({ field: `terms[${index}].name`, message: 'Term name is required' });
    } else if (term.name.length > 255) {
      errors.push({ field: `terms[${index}].name`, message: 'Term name must be 255 characters or less' });
    }

    if (!term.start_date) {
      errors.push({ field: `terms[${index}].start_date`, message: 'Start date is required' });
    }

    if (!term.end_date) {
      errors.push({ field: `terms[${index}].end_date`, message: 'End date is required' });
    } else if (term.start_date && term.end_date) {
      const start = new Date(term.start_date);
      const end = new Date(term.end_date);
      if (end <= start) {
        errors.push({ field: `terms[${index}].end_date`, message: 'End date must be after start date' });
      }
    }
  });

  return errors;
};

/**
 * Validate Step 6: Pricing
 */
export const validateStep6 = (data: {
  pricing_items?: Array<{
    name?: string;
    duration_type?: string;
    duration_value?: number;
    price?: number;
    currency?: string;
  }>;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.pricing_items || data.pricing_items.length === 0) {
    errors.push({ field: 'pricing_items', message: 'At least one pricing item is required' });
    return errors;
  }

  const validDurationTypes = ['MONTHLY', 'WEEKLY', 'SESSION', 'CUSTOM'];

  data.pricing_items.forEach((item, index) => {
    if (!item.name || item.name.trim().length === 0) {
      errors.push({ field: `pricing_items[${index}].name`, message: 'Pricing item name is required' });
    } else if (item.name.length > 255) {
      errors.push({ field: `pricing_items[${index}].name`, message: 'Pricing item name must be 255 characters or less' });
    }

    if (!item.duration_type) {
      errors.push({ field: `pricing_items[${index}].duration_type`, message: 'Duration type is required' });
    } else if (!validDurationTypes.includes(item.duration_type)) {
      errors.push({ field: `pricing_items[${index}].duration_type`, message: `Duration type must be one of: ${validDurationTypes.join(', ')}` });
    }

    if (item.duration_value === undefined || item.duration_value <= 0) {
      errors.push({ field: `pricing_items[${index}].duration_value`, message: 'Duration value is required and must be a positive number' });
    }

    if (item.price === undefined || item.price < 0) {
      errors.push({ field: `pricing_items[${index}].price`, message: 'Price is required and must be 0 or greater' });
    }

    if (!item.currency || item.currency.trim().length === 0) {
      errors.push({ field: `pricing_items[${index}].currency`, message: 'Currency is required' });
    } else if (item.currency.length !== 3) {
      errors.push({ field: `pricing_items[${index}].currency`, message: 'Currency must be a 3-character code (e.g., USD)' });
    }
  });

  return errors;
};
