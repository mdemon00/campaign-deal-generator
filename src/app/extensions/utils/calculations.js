// src/app/extensions/utils/calculations.js

/**
 * Calculates line item totals
 * @param {Object} lineItem - Line item with price, billable, bonus
 * @returns {Object} - Calculated totals
 */
export const calculateLineItemTotals = (lineItem) => {
  const price = Number(lineItem.price) || 0;
  const billable = Number(lineItem.billable) || 0;
  const bonus = Number(lineItem.bonus) || 0;

  const totalBillable = price * billable;
  const totalBonus = price * bonus;
  const totalBudget = totalBillable; // Only billable items count towards budget

  return {
    totalBillable,
    totalBonus,
    totalBudget
  };
};

/**
 * Calculates campaign summary from line items
 * @param {Array} lineItems - Array of line items
 * @returns {Object} - Campaign summary totals
 */
export const calculateCampaignSummary = (lineItems) => {
  return lineItems.reduce(
    (summary, item) => {
      const totals = calculateLineItemTotals(item);
      
      return {
        totalBudget: summary.totalBudget + totals.totalBudget,
        totalBillable: summary.totalBillable + totals.totalBillable,
        totalBonus: summary.totalBonus + totals.totalBonus,
        lineItemCount: summary.lineItemCount + 1
      };
    },
    {
      totalBudget: 0,
      totalBillable: 0,
      totalBonus: 0,
      lineItemCount: 0
    }
  );
};

/**
 * Formats currency values for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (MXN, ARS, COP, etc.)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  const currencySymbols = {
    'MXN': '$',
    'ARS': '$',
    'COP': '$',
    'USD': '$'
  };

  const symbol = currencySymbols[currency] || '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
};

/**
 * Validates numeric inputs
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {boolean} - Is valid number
 */
export const isValidNumber = (value, options = {}) => {
  const { 
    min = 0, 
    max = Number.MAX_SAFE_INTEGER, 
    allowDecimals = true 
  } = options;

  const num = Number(value);
  
  if (isNaN(num)) return false;
  if (num < min || num > max) return false;
  if (!allowDecimals && !Number.isInteger(num)) return false;

  return true;
};