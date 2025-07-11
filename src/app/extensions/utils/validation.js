// src/app/extensions/utils/validation.js

import { VALIDATION_RULES } from './constants.js';

/**
 * Validates basic information form fields
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateBasicInformation = (formData) => {
  const errors = [];
  
  VALIDATION_RULES.REQUIRED_BASIC_FIELDS.forEach(field => {
    if (!formData[field] || formData[field].trim() === '') {
      const fieldLabel = getFieldLabel(field);
      errors.push(`${fieldLabel} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates campaign details form fields
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateCampaignDetails = (formData) => {
  const errors = [];
  
  VALIDATION_RULES.REQUIRED_CAMPAIGN_DETAILS_FIELDS.forEach(field => {
    if (!formData[field] || formData[field].trim() === '') {
      const fieldLabel = getFieldLabel(field);
      errors.push(`${fieldLabel} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates line item data
 * @param {Object} lineItem - The line item to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateLineItem = (lineItem) => {
  const errors = [];
  
  VALIDATION_RULES.REQUIRED_LINE_ITEM_FIELDS.forEach(field => {
    if (!lineItem[field]) {
      const fieldLabel = getFieldLabel(field);
      errors.push(`${fieldLabel} is required`);
    }
  });

  // Additional line item validations
  if (lineItem.price < 0) {
    errors.push('Price cannot be negative');
  }

  if (lineItem.billable < 0) {
    errors.push('Billable quantity cannot be negative');
  }

  if (lineItem.bonus < 0) {
    errors.push('Bonus quantity cannot be negative');
  }

  if (lineItem.startDate && lineItem.endDate) {
    const startDate = new Date(lineItem.startDate);
    const endDate = new Date(lineItem.endDate);
    
    if (startDate >= endDate) {
      errors.push('End date must be after start date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates campaign deal before submission
 * @param {Object} formData - The form data
 * @param {Array} lineItems - Array of line items
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateCampaignDeal = (formData, lineItems) => {
  const errors = [];
  
  // Validate basic information
  const basicValidation = validateBasicInformation(formData);
  if (!basicValidation.isValid) {
    errors.push(...basicValidation.errors);
  }

  // Validate campaign details
  const campaignDetailsValidation = validateCampaignDetails(formData);
  if (!campaignDetailsValidation.isValid) {
    errors.push(...campaignDetailsValidation.errors);
  }

  // Validate line items
  if (lineItems.length < VALIDATION_RULES.MIN_LINE_ITEMS) {
    errors.push(`At least ${VALIDATION_RULES.MIN_LINE_ITEMS} line item is required`);
  }

  lineItems.forEach((item, index) => {
    const itemValidation = validateLineItem(item);
    if (!itemValidation.isValid) {
      itemValidation.errors.forEach(error => {
        errors.push(`Line item ${index + 1}: ${error}`);
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Gets human-readable field labels
 * @param {string} fieldName - The field name
 * @returns {string} - Human-readable label
 */
const getFieldLabel = (fieldName) => {
  const labels = {
    campaignName: 'Campaign Name',
    commercialAgreement: 'Commercial Agreement',
    advertiser: 'Advertiser',
    dealOwner: 'Deal Owner',
    name: 'Line Item Name',
    startDate: 'Start Date',
    endDate: 'End Date',
    campaignType: 'Campaign Type',
    businessName: 'Business Name',
    dealCS: 'Deal CS'
  };

  return labels[fieldName] || fieldName;
};