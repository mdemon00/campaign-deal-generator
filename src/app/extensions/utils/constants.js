// src/app/extensions/utils/constants.js

export const COMMERCIAL_AGREEMENTS = [
  { label: "Select Commercial Agreement", value: "" },
  { label: "Publicis MX 2025", value: "publicis_mx_2025" },
  { label: "OMD AR 2025", value: "omd_ar_2025" },
  { label: "Havas CO 2025", value: "havas_co_2025" }
];

// Fallback advertiser options (used when dynamic loading fails)
export const ADVERTISER_OPTIONS = [
  { label: "Select Advertiser", value: "" },
  { label: "Lancome", value: "lancome" },
  { label: "L'Oreal", value: "loreal" },
];

export const DEAL_OWNER_OPTIONS = [
  { label: "Select Deal Owner", value: "" },
  { label: "Julio Salvide", value: "julio_salvide" },
  { label: "Maria Garcia", value: "maria_garcia" }
];

export const CAMPAIGN_TYPE_OPTIONS = [
  { label: "Select Campaign Type", value: "" },
  { label: "AON", value: "aon" },
  { label: "Flight", value: "flight" },
  { label: "Event", value: "event" }
];

// Deal CS Options - Fallback only (use searchDealOwners for dynamic loading)
export const DEAL_CS_OPTIONS = [
  { label: "Select CS Representative", value: "" }
];

export const COUNTRY_OPTIONS = [
  { label: "Mexico", value: "MX" },
  { label: "Argentina", value: "AR" },
  { label: "Colombia", value: "CO" }
];

export const LINE_ITEM_TYPE_OPTIONS = [
  { label: "Initial", value: "initial" },
  { label: "Upweight", value: "upweight" },
  { label: "Rebooking", value: "rebooking" }
];

// Commercial Agreement Mappings (fallback for static agreements)
export const COMMERCIAL_AGREEMENT_MAPPING = {
  publicis_mx_2025: {
    company: "Publicis Mexico",
    currency: "MXN"
  },
  omd_ar_2025: {
    company: "OMD Argentina",
    currency: "ARS"
  },
  havas_co_2025: {
    company: "Havas Colombia",
    currency: "COP"
  }
};

// HubSpot Object IDs
export const HUBSPOT_OBJECT_IDS = {
  COMMERCIAL_AGREEMENTS: "2-39552013",
  ADVERTISERS: "2-40333244",
  CAMPAIGN_DEALS: "2-45275187", // ✅ Your Campaign Deal Object ID
  CONTACTS: "134130492272" // ✅ Contact Object ID
};

// Form field validation rules
export const VALIDATION_RULES = {
  REQUIRED_BASIC_FIELDS: ['campaignName', 'advertiser', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType'], // ✅ Updated
  REQUIRED_LINE_ITEM_FIELDS: ['name', 'startDate', 'endDate'],
  REQUIRED_CAMPAIGN_DETAILS_FIELDS: ['taxId', 'businessName'], // ✅ Updated - removed moved fields
  REQUIRED_COMMERCIAL_AGREEMENT_FIELDS: ['commercialAgreement'], // ✅ New section
  MIN_LINE_ITEMS: 1
};

// Initial form state
export const INITIAL_FORM_STATE = {
  campaignName: "",
  advertiser: "",
  advertiserCountry: "", // ✅ New field
  advertiserCompany: "", // ✅ New field
  dealOwner: "",
  assignedCustomerService: "", // ✅ Moved from Campaign Details (was dealCS)
  contact: "", // ✅ New field
  campaignType: "", // ✅ Moved from Campaign Details
  linkToGoogleDrive: "", // ✅ New field
  commercialAgreement: "", // ✅ Moved to Commercial Agreement section
  company: "", // ✅ Moved to Commercial Agreement section
  currency: "", // ✅ Moved to Commercial Agreement section
  taxId: "", // ✅ Remains in Campaign Details
  businessName: "" // ✅ Remains in Campaign Details
};

// Initial campaign details state
export const INITIAL_CAMPAIGN_DETAILS_STATE = {
  campaignType: "",
  taxId: "",
  businessName: "",
  dealCS: ""
};

export const INITIAL_LINE_ITEM_STATE = {
  name: "",
  country: "MX",
  type: "initial",
  startDate: null,
  endDate: null,
  price: 0,
  billable: 0,
  bonus: 0
};

// Search and pagination defaults
export const SEARCH_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  SEARCH_LIMIT: 50,
  DEBOUNCE_DELAY: 500
};

// === NEW: Save Status Constants ===

// Save status enumeration values (must match HubSpot property exactly)
export const SAVE_STATUS = {
  NOT_SAVED: "not_saved",   // ✅ Matches HubSpot
  SAVED: "Saved",           // ✅ Fixed: Capital S to match HubSpot
  IN_PROGRESS: "in_progress" // ✅ Matches HubSpot
};

// Component save states (for UI state management)
export const COMPONENT_SAVE_STATES = {
  NOT_SAVED: "not_saved",     // Never saved, show empty form
  SAVED: "saved",             // Saved, show populated form + "saved" indicator  
  MODIFIED: "modified",       // Saved but user modified, show "save" button
  SAVING: "saving",           // Currently saving, show loading
  LOADING: "loading",         // Loading saved data
  ERROR: "error"              // Save/load failed, show error message
};

// Save status display messages
export const SAVE_STATUS_MESSAGES = {
  [SAVE_STATUS.NOT_SAVED]: "📝 Ready to fill basic information",
  [SAVE_STATUS.SAVED]: "✅ Basic information saved",      // ✅ Fixed: Capital S
  [SAVE_STATUS.IN_PROGRESS]: "🔄 Save in progress...",
  [COMPONENT_SAVE_STATES.MODIFIED]: "⚠️ You have unsaved changes",
  [COMPONENT_SAVE_STATES.SAVING]: "💾 Saving...",
  [COMPONENT_SAVE_STATES.LOADING]: "📖 Loading...",
  [COMPONENT_SAVE_STATES.ERROR]: "❌ Error occurred"
};

// Save status colors for UI
export const SAVE_STATUS_COLORS = {
  [SAVE_STATUS.NOT_SAVED]: "medium",
  [SAVE_STATUS.SAVED]: "success",      // ✅ Fixed: Capital S
  [SAVE_STATUS.IN_PROGRESS]: "warning",
  [COMPONENT_SAVE_STATES.MODIFIED]: "warning",
  [COMPONENT_SAVE_STATES.SAVING]: "medium",
  [COMPONENT_SAVE_STATES.LOADING]: "medium",
  [COMPONENT_SAVE_STATES.ERROR]: "error"
};