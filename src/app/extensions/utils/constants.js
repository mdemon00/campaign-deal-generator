// src/app/extensions/utils/constants.js

export const COMMERCIAL_AGREEMENTS = [
  { label: "Select Commercial Agreement", value: "" },
  { label: "Publicis MX 2025", value: "publicis_mx_2025" },
  { label: "OMD AR 2025", value: "omd_ar_2025" },
  { label: "Havas CO 2025", value: "havas_co_2025" }
];

export const ADVERTISER_OPTIONS = [
  { label: "Select or Create New", value: "" },
  { label: "Lancome", value: "lancome" },
  { label: "L'Oreal", value: "loreal" },
  { label: "+ Create New Advertiser", value: "new" }
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

export const DEAL_CS_OPTIONS = [
  { label: "Select CS Representative", value: "" },
  { label: "Mara Corpus", value: "mara_corpus" },
  { label: "Juan Perez", value: "juan_perez" }
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

// Commercial Agreement Mappings
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

// Form field validation rules
export const VALIDATION_RULES = {
  REQUIRED_BASIC_FIELDS: ['campaignName', 'commercialAgreement', 'advertiser', 'dealOwner'],
  REQUIRED_LINE_ITEM_FIELDS: ['name', 'startDate', 'endDate'],
  MIN_LINE_ITEMS: 1
};

// Initial form state
export const INITIAL_FORM_STATE = {
  campaignName: "",
  commercialAgreement: "",
  company: "",
  advertiser: "",
  dealOwner: "",
  currency: "",
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