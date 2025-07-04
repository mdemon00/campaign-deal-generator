// src/app/extensions/components/BasicInformation.jsx
// FIXED: Simplified auto-population - now handled by parent component

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Input,
  Select,
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text,
  Button,
  Alert,
  LoadingSpinner
} from "@hubspot/ui-extensions";

import {
  DEAL_OWNER_OPTIONS,
  CAMPAIGN_TYPE_OPTIONS,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const BasicInformation = forwardRef(({
  formData,
  onChange,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false
}, ref) => {

  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  // === ADVERTISERS STATE ===
  const [advertisers, setAdvertisers] = useState([{ label: "Select Advertiser", value: "" }]);
  const [advertiserSearchTerm, setAdvertiserSearchTerm] = useState("");
  const [isAdvertiserLoading, setIsAdvertiserLoading] = useState(false);
  const [isAdvertiserSearching, setIsAdvertiserSearching] = useState(false);
  const [hasAdvertiserLoaded, setHasAdvertiserLoaded] = useState(false);
  const [advertiserErrorMessage, setAdvertiserErrorMessage] = useState("");
  const [advertiserHasMore, setAdvertiserHasMore] = useState(false);
  const [lastAdvertiserSearchTerm, setLastAdvertiserSearchTerm] = useState("");

  // === DEAL OWNERS STATE ===
  const [dealOwners, setDealOwners] = useState(DEAL_OWNER_OPTIONS);
  const [dealOwnerSearchTerm, setDealOwnerSearchTerm] = useState("");
  const [isDealOwnerLoading, setIsDealOwnerLoading] = useState(false);
  const [isDealOwnerSearching, setIsDealOwnerSearching] = useState(false);
  const [hasDealOwnerLoaded, setHasDealOwnerLoaded] = useState(false);
  const [dealOwnerErrorMessage, setDealOwnerErrorMessage] = useState("");
  const [dealOwnerHasMore, setDealOwnerHasMore] = useState(false);
  const [lastDealOwnerSearchTerm, setLastDealOwnerSearchTerm] = useState("");

  // === DEAL CS STATE ===
  const [customerServices, setCustomerServices] = useState([{ label: "Select Deal CS", value: "" }]);
  const [customerServiceSearchTerm, setCustomerServiceSearchTerm] = useState("");
  const [isCustomerServiceLoading, setIsCustomerServiceLoading] = useState(false);
  const [isCustomerServiceSearching, setIsCustomerServiceSearching] = useState(false);
  const [hasCustomerServiceLoaded, setHasCustomerServiceLoaded] = useState(false);
  const [customerServiceErrorMessage, setCustomerServiceErrorMessage] = useState("");
  const [customerServiceHasMore, setCustomerServiceHasMore] = useState(false);
  const [lastCustomerServiceSearchTerm, setLastCustomerServiceSearchTerm] = useState("");

  // === CONTACTS STATE ===
  const [contacts, setContacts] = useState([{ label: "Select Contact", value: "" }]);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [isContactSearching, setIsContactSearching] = useState(false);
  const [hasContactLoaded, setHasContactLoaded] = useState(false);
  const [contactErrorMessage, setContactErrorMessage] = useState("");
  const [contactHasMore, setContactHasMore] = useState(false);
  const [lastContactSearchTerm, setLastContactSearchTerm] = useState("");

  // === VIEW MODE DISPLAY LABELS ===
  const [displayLabels, setDisplayLabels] = useState({
    advertiser: "",
    dealOwner: "",
    assignedCustomerService: "",
    contact: "",
    campaignType: ""
  });

  // === COMPONENT INITIALIZATION ===

  // Load saved data on component mount (only in edit mode)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadBasicInformation();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // 🔧 SIMPLIFIED: Load display labels for view mode (no auto-population)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && !isEditMode) {
      loadDisplayLabelsForViewMode();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load default data for all search components (only in edit mode)
  useEffect(() => {
    if (runServerless && isEditMode) {
      // Skip loading default advertisers - we'll only load when user searches
      // Skip loading default deal owners and customer services - we'll only load when user searches
      // Skip loading default contacts - we'll only load when user searches
    }
  }, [runServerless, isEditMode, hasAdvertiserLoaded, hasDealOwnerLoaded, hasCustomerServiceLoaded, hasContactLoaded]);

  // Update display labels in edit mode when arrays are populated
  useEffect(() => {
    if (isEditMode) {
      updateDisplayLabels();
    }
  }, [formData, advertisers, dealOwners, customerServices, contacts, isEditMode]);

  // Track form changes (only in edit mode)
  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const basicFields = ['campaignName', 'taxId', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
      const hasChanges = basicFields.some(key =>
        formData[key] !== initialFormData[key]
      );

      if (hasChanges && !hasUnsavedChanges) {
        setHasUnsavedChanges(true);
        setSaveState(COMPONENT_SAVE_STATES.MODIFIED);
      } else if (!hasChanges && hasUnsavedChanges) {
        setHasUnsavedChanges(false);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
      }
    }
  }, [formData, initialFormData, saveState, hasUnsavedChanges, isEditMode]);

  // === DISPLAY LABEL FUNCTIONS ===
  const updateDisplayLabels = () => {
    const newLabels = { ...displayLabels };

    // Advertiser
    if (!displayLabels.advertiser || isEditMode) {
      const selectedAdvertiser = advertisers.find(a => a.value === formData.advertiser);
      if (selectedAdvertiser) {
        newLabels.advertiser = selectedAdvertiser.label;
      }
    }

    // Deal Owner
    if (!displayLabels.dealOwner || isEditMode) {
      const selectedDealOwner = dealOwners.find(o => o.value === formData.dealOwner);
      if (selectedDealOwner) {
        newLabels.dealOwner = selectedDealOwner.label;
      }
    }

    // Assigned Customer Service
    if (!displayLabels.assignedCustomerService || isEditMode) {
      const selectedCS = customerServices.find(cs => cs.value === formData.assignedCustomerService);
      if (selectedCS) {
        newLabels.assignedCustomerService = selectedCS.label;
      }
    }

    // Contact
    if (!displayLabels.contact || isEditMode) {
      const selectedContact = contacts.find(c => c.value === formData.contact);
      if (selectedContact) {
        newLabels.contact = selectedContact.label;
      }
    }

    // Campaign Type
    if (!displayLabels.campaignType || isEditMode) {
      const selectedType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === formData.campaignType);
      if (selectedType) {
        newLabels.campaignType = selectedType.label;
      }
    }

    setDisplayLabels(newLabels);
  };

  // 🔧 SIMPLIFIED: Only load display labels, no auto-population
  const loadDisplayLabelsForViewMode = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    try {
      const response = await runServerless({
        name: "loadBasicInformation",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // 🔧 FIXED: Only set display labels, don't try to modify form data
        const newDisplayLabels = {};

        // Set display labels from association data with proper fallbacks
        if (data.associations?.advertiser) {
          newDisplayLabels.advertiser = data.associations.advertiser.label;
        } else if (data.formData.advertiser) {
          newDisplayLabels.advertiser = `Advertiser (${data.formData.advertiser})`;
        } else {
          newDisplayLabels.advertiser = "";
        }

        if (data.associations?.dealOwner) {
          newDisplayLabels.dealOwner = data.associations.dealOwner.label;
        } else if (data.formData.dealOwner) {
          newDisplayLabels.dealOwner = `Owner (${data.formData.dealOwner})`;
        } else {
          newDisplayLabels.dealOwner = "";
        }

        if (data.associations?.assignedCustomerService) {
          newDisplayLabels.assignedCustomerService = data.associations.assignedCustomerService.label;
        } else if (data.formData.assignedCustomerService) {
          // Try to find the label from the stored data or use a generic label
          const storedLabel = data.associations?.assignedCustomerService?.label;
          if (storedLabel) {
            newDisplayLabels.assignedCustomerService = storedLabel;
          } else {
            // Don't show the raw ID, show nothing if we can't resolve the name
            newDisplayLabels.assignedCustomerService = "";
          }
        } else {
          newDisplayLabels.assignedCustomerService = "";
        }

        if (data.associations?.contact) {
          newDisplayLabels.contact = data.associations.contact.label;
        } else if (data.formData.contact) {
          newDisplayLabels.contact = `Contact (${data.formData.contact})`;
        } else {
          newDisplayLabels.contact = "";
        }

        const selectedType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === data.formData.campaignType);
        newDisplayLabels.campaignType = selectedType?.label || data.formData.campaignType || "";

        setDisplayLabels(newDisplayLabels);
      }
    } catch (error) {
      console.warn("Could not load display labels for view mode:", error);
    }
  };

  // === SAVE/LOAD FUNCTIONS ===
  const loadBasicInformation = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "loadBasicInformation",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data
        const basicFields = ['campaignName', 'taxId', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
        basicFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Update display labels and search terms from association data
        const newDisplayLabels = { ...displayLabels };

        if (data.associations?.advertiser) {
          newDisplayLabels.advertiser = data.associations.advertiser.label;
          setAdvertiserSearchTerm(data.associations.advertiser.label);
        }

        if (data.associations?.dealOwner) {
          newDisplayLabels.dealOwner = data.associations.dealOwner.label;
          setDealOwnerSearchTerm(data.associations.dealOwner.label);
        }

        if (data.associations?.assignedCustomerService) {
          newDisplayLabels.assignedCustomerService = data.associations.assignedCustomerService.label;
          setCustomerServiceSearchTerm(data.associations.assignedCustomerService.label);
        }

        if (data.associations?.contact) {
          newDisplayLabels.contact = data.associations.contact.label;
          setContactSearchTerm(data.associations.contact.label);
        }

        const selectedType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === data.formData.campaignType);
        newDisplayLabels.campaignType = selectedType?.label || data.formData.campaignType || "";

        setDisplayLabels(newDisplayLabels);

        // Store initial form data for change tracking
        const basicFormData = {};
        basicFields.forEach(key => {
          basicFormData[key] = data.formData[key];
        });
        setInitialFormData(basicFormData);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.campaignName || data.formData.taxId || data.formData.advertiser)
          });
        }

      } else {
        throw new Error(response?.response?.message || "Failed to load data");
      }
    } catch (error) {
      console.error("❌ Error loading basic information:", error);
      setSaveError(`Failed to load: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveBasicInformation = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "saveBasicInformation",
        parameters: {
          campaignDealId: context.crm.objectId,
          campaignName: formData.campaignName,
          taxId: formData.taxId,
          advertiser: formData.advertiser,
          advertiserCountry: formData.advertiserCountry,
          advertiserCompany: formData.advertiserCompany,
          dealOwner: formData.dealOwner,
          assignedCustomerService: formData.assignedCustomerService,
          contact: formData.contact,
          campaignType: formData.campaignType,
          linkToGoogleDrive: formData.linkToGoogleDrive,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update tracking state
        const basicFields = ['campaignName', 'taxId', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
        const basicFormData = {};
        basicFields.forEach(key => {
          basicFormData[key] = formData[key];
        });
        setInitialFormData(basicFormData);
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: 'Saved',
            lastSaved: data.savedAt,
            hasData: true
          });
        }
      } else {
        throw new Error(response?.response?.message || "Failed to save data");
      }
    } catch (error) {
      console.error("❌ Error saving basic information:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  // === ADVERTISER SEARCH FUNCTIONS ===
  const performAdvertiserSearch = async () => {
    if (!runServerless || !isEditMode || !advertiserSearchTerm.trim()) return;

    setIsAdvertiserSearching(true);
    setAdvertiserErrorMessage("");

    try {
      const searchTerm = advertiserSearchTerm.trim();

      const response = await runServerless({
        name: "searchAdvertisers",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAdvertisers(data.options || [{ label: "Select Advertiser", value: "" }]);
        setAdvertiserHasMore(data.hasMore || false);
        setLastAdvertiserSearchTerm(searchTerm);
      } else {
        throw new Error("Invalid advertiser search response");
      }
    } catch (error) {
      console.error("Advertiser search error:", error);
      setAdvertiserErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsAdvertiserSearching(false);
    }
  };

  // Removed loadDefaultAdvertisers - advertisers are now loaded only through search

  // === DEAL OWNERS SEARCH FUNCTIONS ===
  const performDealOwnerSearch = async () => {
    if (!runServerless || !isEditMode || !dealOwnerSearchTerm.trim()) return;

    setIsDealOwnerSearching(true);
    setDealOwnerErrorMessage("");

    try {
      const searchTerm = dealOwnerSearchTerm.trim();

      const response = await runServerless({
        name: "searchDealOwners",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setDealOwners(data.options || DEAL_OWNER_OPTIONS);
        setDealOwnerHasMore(data.hasMore || false);
        setLastDealOwnerSearchTerm(searchTerm);
      } else {
        throw new Error("Invalid deal owner search response");
      }
    } catch (error) {
      console.error("Deal owner search error:", error);
      setDealOwnerErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsDealOwnerSearching(false);
    }
  };

  // Removed loadDefaultDealOwners - deal owners are now loaded only through search

  // === CUSTOMER SERVICE SEARCH FUNCTIONS ===
  const performCustomerServiceSearch = async () => {
    if (!runServerless || !isEditMode || !customerServiceSearchTerm.trim()) return;

    setIsCustomerServiceSearching(true);
    setCustomerServiceErrorMessage("");

    try {
      const searchTerm = customerServiceSearchTerm.trim();

      const response = await runServerless({
        name: "searchDealOwners", // Reuse deal owners for customer service
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        // Update labels to reflect Deal CS role
        const options = data.options.map(option => ({
          ...option,
          label: option.label === "Select Deal Owner" ? "Select Deal CS" : option.label
        }));
        setCustomerServices(options);
        setCustomerServiceHasMore(data.hasMore || false);
        setLastCustomerServiceSearchTerm(searchTerm);

        console.log('🔍 [SEARCH] Customer service search results:', options?.length || 0);
      } else {
        throw new Error("Invalid customer service search response");
      }
    } catch (error) {
      console.error("Customer service search error:", error);
      setCustomerServiceErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsCustomerServiceSearching(false);
    }
  };

  // Removed loadDefaultCustomerServices - deal CS are now loaded only through search

  // === CONTACT SEARCH FUNCTIONS ===
  const performContactSearch = async () => {
    if (!runServerless || !isEditMode || !contactSearchTerm.trim()) return;

    setIsContactSearching(true);
    setContactErrorMessage("");

    try {
      const searchTerm = contactSearchTerm.trim();

      const response = await runServerless({
        name: "searchContacts",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setContacts(data.options || [{ label: "Select Contact", value: "" }]);
        setContactHasMore(data.hasMore || false);
        setLastContactSearchTerm(searchTerm);

        console.log('🔍 [SEARCH] Contact search results:', data.options?.length || 0);
      } else {
        throw new Error("Invalid contact search response");
      }
    } catch (error) {
      console.error("Contact search error:", error);
      setContactErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsContactSearching(false);
    }
  };

  // Removed loadDefaultContacts - contacts are now loaded only through search

  // === EVENT HANDLERS ===
  const handleAdvertiserChange = (value) => {
    if (!isEditMode) return;

    const selectedAdvertiser = advertisers.find(advertiser => advertiser.value === value);

    onChange('advertiser', value);

    if (selectedAdvertiser && selectedAdvertiser.value !== "" && selectedAdvertiser.value !== "new") {
      setAdvertiserSearchTerm(selectedAdvertiser.label);

      console.log(`🔧 [EDIT MODE] Auto-populating from advertiser selection:`, selectedAdvertiser);

      // 🔧 FIXED: Auto-populate only in edit mode when user manually selects
      if (selectedAdvertiser.country) {
        onChange('advertiserCountry', selectedAdvertiser.country);
      }
      if (selectedAdvertiser.companyName) {
        onChange('advertiserCompany', selectedAdvertiser.companyName);
      }
    } else {
      // Clear auto-populated fields
      onChange('advertiserCountry', '');
      onChange('advertiserCompany', '');
    }
  };

  const handleDealOwnerChange = (value) => {
    if (!isEditMode) return;

    const selectedDealOwner = dealOwners.find(owner => owner.value === value);

    onChange('dealOwner', value);

    if (selectedDealOwner && selectedDealOwner.value !== "") {
      setDealOwnerSearchTerm(selectedDealOwner.label);
    }
  };

  const handleCustomerServiceChange = (value) => {
    if (!isEditMode) return;

    const selectedCS = customerServices.find(cs => cs.value === value);

    onChange('assignedCustomerService', value);

    if (selectedCS && selectedCS.value !== "") {
      setCustomerServiceSearchTerm(selectedCS.label);
    }
  };

  const handleContactChange = (value) => {
    if (!isEditMode) return;

    const selectedContact = contacts.find(contact => contact.value === value);

    onChange('contact', value);

    if (selectedContact && selectedContact.value !== "") {
      setContactSearchTerm(selectedContact.label);
    }
  };

  const handleFieldChange = (field, value) => {
    if (!isEditMode) return;

    if (field === 'advertiser') {
      handleAdvertiserChange(value);
    } else if (field === 'dealOwner') {
      handleDealOwnerChange(value);
    } else if (field === 'assignedCustomerService') {
      handleCustomerServiceChange(value);
    } else if (field === 'contact') {
      handleContactChange(value);
    } else {
      onChange(field, value);
    }
  };

  // === CLEAR SEARCH FUNCTIONS ===
  const clearAdvertiserSearch = () => {
    if (!isEditMode) return;
    setAdvertiserSearchTerm("");
    setAdvertiserErrorMessage("");
    setLastAdvertiserSearchTerm("");
    setAdvertisers([{ label: "Select Advertiser", value: "" }]);
  };

  const clearDealOwnerSearch = () => {
    if (!isEditMode) return;
    setDealOwnerSearchTerm("");
    setDealOwnerErrorMessage("");
    setLastDealOwnerSearchTerm("");
    setDealOwners(DEAL_OWNER_OPTIONS);
  };

  const clearCustomerServiceSearch = () => {
    if (!isEditMode) return;
    setCustomerServiceSearchTerm("");
    setCustomerServiceErrorMessage("");
    setLastCustomerServiceSearchTerm("");
    setCustomerServices([{ label: "Select Deal CS", value: "" }]);
  };

  const clearContactSearch = () => {
    if (!isEditMode) return;
    setContactSearchTerm("");
    setContactErrorMessage("");
    setLastContactSearchTerm("");
    setContacts([{ label: "Select Contact", value: "" }]);
  };

  // === MODE CONTROL FUNCTIONS ===
  // Removed browse/search mode switching for advertisers

  // Removed browse/search mode switching for deal owners and customer service

  // Removed browse/search mode switching for contacts

  // === UI HELPER FUNCTIONS ===
  const getSaveStatusDisplay = () => {
    const message = SAVE_STATUS_MESSAGES[saveState] || SAVE_STATUS_MESSAGES[COMPONENT_SAVE_STATES.NOT_SAVED];
    const color = SAVE_STATUS_COLORS[saveState] || SAVE_STATUS_COLORS[COMPONENT_SAVE_STATES.NOT_SAVED];

    let statusText = message;
    if (saveState === COMPONENT_SAVE_STATES.SAVED && lastSaved) {
      statusText = `${message} on ${lastSaved}`;
    }

    return { message: statusText, color };
  };

  const shouldShowSaveButton = () => {
    return isEditMode && (
      saveState === COMPONENT_SAVE_STATES.NOT_SAVED ||
      saveState === COMPONENT_SAVE_STATES.MODIFIED ||
      saveState === COMPONENT_SAVE_STATES.ERROR
    );
  };

  const isSaveDisabled = () => {
    return saveState === COMPONENT_SAVE_STATES.SAVING ||
      saveState === COMPONENT_SAVE_STATES.LOADING ||
      !formData.campaignName ||
      !formData.taxId ||
      !formData.advertiser ||
      !formData.dealOwner ||
      !formData.assignedCustomerService ||
      !formData.contact ||
      !formData.campaignType;
  };

  // === STATUS MESSAGES ===
  const getAdvertiserStatusMessage = () => {
    if (!isEditMode) return "";
    if (isAdvertiserSearching) return "Searching advertisers...";
    if (isAdvertiserLoading) return "Loading advertisers...";
    if (lastAdvertiserSearchTerm) {
      const count = advertisers.length > 1 ? advertisers.length - 1 : 0;
      return `${count} results for "${lastAdvertiserSearchTerm}"`;
    }
    return "";
  };

  const getDealOwnerStatusMessage = () => {
    if (!isEditMode) return "";
    if (isDealOwnerSearching) return "Searching deal owners...";
    if (isDealOwnerLoading) return "Loading deal owners...";
    if (lastDealOwnerSearchTerm) {
      const count = dealOwners.length > 1 ? dealOwners.length - 1 : 0;
      return `${count} results for "${lastDealOwnerSearchTerm}"`;
    }
    return "";
  };

  const getCustomerServiceStatusMessage = () => {
    if (!isEditMode) return "";
    if (isCustomerServiceSearching) return "Searching deal CS...";
    if (isCustomerServiceLoading) return "Loading deal CS...";
    if (lastCustomerServiceSearchTerm) {
      const count = customerServices.length > 1 ? customerServices.length - 1 : 0;
      return `${count} results for "${lastCustomerServiceSearchTerm}"`;
    }
    return "";
  };

  const getContactStatusMessage = () => {
    if (!isEditMode) return "";
    if (isContactSearching) return "Searching contacts...";
    if (isContactLoading) return "Loading contacts...";
    if (lastContactSearchTerm) {
      const count = contacts.length > 1 ? contacts.length - 1 : 0;
      return `${count} results for "${lastContactSearchTerm}"`;
    }
    return "";
  };

  const statusDisplay = getSaveStatusDisplay();

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Validate required fields
      const requiredFields = ['campaignName', 'taxId', 'advertiser', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType'];
      const missingFields = requiredFields.filter(field => !formData[field]);

      if (missingFields.length > 0) {
        return `Please fill all required fields in Basic Information: ${missingFields.join(', ')}.`;
      }

      await saveBasicInformation();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Basic Information.";
      return null;
    }
  }));

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Basic Information</Heading>

        {/* Save Status Display - Only show in Edit Mode */}
        {isEditMode && (
          <Flex align="center" gap="small">
            <Text
              variant="microcopy"
              format={{ color: statusDisplay.color }}
            >
              {statusDisplay.message}
            </Text>
            {saveState === COMPONENT_SAVE_STATES.SAVING && <LoadingSpinner size="xs" />}
            {saveState === COMPONENT_SAVE_STATES.LOADING && <LoadingSpinner size="xs" />}
          </Flex>
        )}

        {/* VIEW MODE INDICATOR */}
        {!isEditMode && (
          <Text variant="microcopy" format={{ color: 'medium' }}>
            👁️ View Mode - Read Only
          </Text>
        )}
      </Flex>

      <Divider />

      {/* Save Error Alert - Only show in Edit Mode */}
      {isEditMode && saveError && (
        <Box marginTop="small" marginBottom="medium">
          <Alert variant="error">
            {saveError}
          </Alert>
        </Box>
      )}

      <Box marginTop="medium">
        {/* ROW 1: Campaign Name + Tax ID */}
        <Box marginBottom="extra-large">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Input
                label="Campaign Name *"
                name="campaignName"
                placeholder={isEditMode ? "Enter campaign name" : "No campaign name"}
                value={formData.campaignName}
                onChange={isEditMode ? (value) => handleFieldChange("campaignName", value) : undefined}
                readOnly={!isEditMode}
                required={isEditMode}
              />
            </Box>

            <Box flex={1} minWidth="250px">
              <Input
                label="Tax ID *"
                name="taxId"
                placeholder={isEditMode ? "Enter or create new Tax ID" : "No tax ID"}
                value={formData.taxId}
                onChange={isEditMode ? (value) => handleFieldChange("taxId", value) : undefined}
                readOnly={!isEditMode}
                required={isEditMode}
              />
            </Box>
          </Flex>
        </Box>

        <Divider></ Divider>

        {/* ROW 2: Advertiser (Simple Search Interface) */}
        <Box marginBottom="extra-large">
          {/* View Mode: Simple Input Display */}
          {!isEditMode && (
            <Input
              label="Advertiser *"
              name="advertiser"
              placeholder="No advertiser selected"
              value={
                displayLabels.advertiser ||
                (formData.advertiser ? `Advertiser (${formData.advertiser})` : "")
              }
              readOnly={true}
            />
          )}

          {/* Edit Mode: Simple Search Interface */}
          {isEditMode && (
            <>
              <Flex gap="small" direction="row" align="end">
                <Box flex={1}>
                  <Input
                    label="Search Advertisers *"
                    name="searchAdvertisers"
                    placeholder="Enter advertiser or company name..."
                    value={advertiserSearchTerm}
                    onChange={(value) => setAdvertiserSearchTerm(value)}
                    disabled={isAdvertiserLoading || isAdvertiserSearching}
                  />
                </Box>
                <Box>
                  <Button
                    onClick={performAdvertiserSearch}
                    disabled={!advertiserSearchTerm.trim() || isAdvertiserSearching || isAdvertiserLoading}
                  >
                    {isAdvertiserSearching ? <LoadingSpinner size="xs" /> : "🔍 Search"}
                  </Button>
                </Box>
                {lastAdvertiserSearchTerm && (
                  <Box>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearAdvertiserSearch}
                    >
                      ✕ Clear
                    </Button>
                  </Box>
                )}
              </Flex>

              {/* Search Results */}
              {lastAdvertiserSearchTerm && advertisers.length > 1 && (
                <Box marginTop="small">
                  <Select
                    label="Select from search results"
                    name="advertiserSearchResults"
                    options={advertisers}
                    value={formData.advertiser}
                    onChange={(value) => handleFieldChange("advertiser", value)}
                    disabled={isAdvertiserSearching}
                  />
                </Box>
              )}

              {/* Status Messages */}
              {getAdvertiserStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getAdvertiserStatusMessage()}
                </Text>
              )}

              {/* Error Messages */}
              {advertiserErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {advertiserErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setAdvertiserErrorMessage("");
                        if (lastAdvertiserSearchTerm) {
                          performAdvertiserSearch();
                        }
                      }}
                      disabled={isAdvertiserLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ROW 3: Advertiser Country + Advertiser Company */}
        <Box marginBottom="extra-large">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Input
                label="Advertiser Country"
                name="advertiserCountry"
                placeholder={isEditMode ? "Auto-populated from advertiser" : "No country information"}
                value={formData.advertiserCountry}
                readOnly={true}
              />
            </Box>

            <Box flex={1} minWidth="250px">
              <Input
                label="Advertiser Company"
                name="advertiserCompany"
                placeholder={isEditMode ? "Auto-populated from advertiser" : "No company information"}
                value={formData.advertiserCompany}
                readOnly={true}
              />
            </Box>
          </Flex>
        </Box>

        <Divider></ Divider>

        {/* ROW 4: Deal Owner (Simple Search Interface) */}
        <Box marginBottom="extra-large">
          {/* View Mode: Simple Input Display */}
          {!isEditMode && (
            <Input
              label="Deal Owner *"
              name="dealOwner"
              placeholder="No deal owner selected"
              value={
                displayLabels.dealOwner ||
                (formData.dealOwner ? `Owner (${formData.dealOwner})` : "")
              }
              readOnly={true}
            />
          )}

          {/* Edit Mode: Simple Search Interface */}
          {isEditMode && (
            <>
              <Flex gap="small" direction="row" align="end">
                <Box flex={1}>
                  <Input
                    label="Search Deal Owners *"
                    name="searchDealOwners"
                    placeholder="Enter owner name or email..."
                    value={dealOwnerSearchTerm}
                    onChange={(value) => setDealOwnerSearchTerm(value)}
                    disabled={isDealOwnerLoading || isDealOwnerSearching}
                  />
                </Box>
                <Box>
                  <Button
                    onClick={performDealOwnerSearch}
                    disabled={!dealOwnerSearchTerm.trim() || isDealOwnerSearching || isDealOwnerLoading}
                  >
                    {isDealOwnerSearching ? <LoadingSpinner size="xs" /> : "🔍 Search"}
                  </Button>
                </Box>
                {lastDealOwnerSearchTerm && (
                  <Box>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearDealOwnerSearch}
                    >
                      ✕ Clear
                    </Button>
                  </Box>
                )}
              </Flex>

              {/* Search Results */}
              {lastDealOwnerSearchTerm && dealOwners.length > 1 && (
                <Box marginTop="small">
                  <Select
                    label="Select from search results"
                    name="dealOwnerSearchResults"
                    options={dealOwners}
                    value={formData.dealOwner}
                    onChange={(value) => handleFieldChange("dealOwner", value)}
                    disabled={isDealOwnerSearching}
                  />
                </Box>
              )}

              {/* Status Messages */}
              {getDealOwnerStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getDealOwnerStatusMessage()}
                </Text>
              )}

              {/* Error Messages */}
              {dealOwnerErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {dealOwnerErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setDealOwnerErrorMessage("");
                        if (lastDealOwnerSearchTerm) {
                          performDealOwnerSearch();
                        }
                      }}
                      disabled={isDealOwnerLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        <Divider></ Divider>

        {/* ROW 5: Deal CS (Simple Search Interface) */}
        <Box marginBottom="extra-large">
          {/* View Mode: Simple Input Display */}
          {!isEditMode && (
            <Input
              label="Deal CS *"
              name="assignedCustomerService"
              placeholder="No deal CS selected"
              value={
                displayLabels.assignedCustomerService ||
                (formData.assignedCustomerService ? `Deal CS (${formData.assignedCustomerService})` : "")
              }
              readOnly={true}
            />
          )}

          {/* Edit Mode: Simple Search Interface */}
          {isEditMode && (
            <>
              <Flex gap="small" direction="row" align="end">
                <Box flex={1}>
                  <Input
                    label="Search Deal CS *"
                    name="searchCustomerService"
                    placeholder="Enter deal CS name or email..."
                    value={customerServiceSearchTerm}
                    onChange={(value) => setCustomerServiceSearchTerm(value)}
                    disabled={isCustomerServiceLoading || isCustomerServiceSearching}
                  />
                </Box>
                <Box>
                  <Button
                    onClick={performCustomerServiceSearch}
                    disabled={!customerServiceSearchTerm.trim() || isCustomerServiceSearching || isCustomerServiceLoading}
                  >
                    {isCustomerServiceSearching ? <LoadingSpinner size="xs" /> : "🔍 Search"}
                  </Button>
                </Box>
                {lastCustomerServiceSearchTerm && (
                  <Box>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearCustomerServiceSearch}
                    >
                      ✕ Clear
                    </Button>
                  </Box>
                )}
              </Flex>

              {/* Search Results */}
              {lastCustomerServiceSearchTerm && customerServices.length > 1 && (
                <Box marginTop="small">
                  <Select
                    label="Select from search results"
                    name="customerServiceSearchResults"
                    options={customerServices}
                    value={formData.assignedCustomerService}
                    onChange={(value) => handleFieldChange("assignedCustomerService", value)}
                    disabled={isCustomerServiceSearching}
                  />
                </Box>
              )}

              {/* Status Messages */}
              {getCustomerServiceStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getCustomerServiceStatusMessage()}
                </Text>
              )}

              {/* Error Messages */}
              {customerServiceErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {customerServiceErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setCustomerServiceErrorMessage("");
                        if (lastCustomerServiceSearchTerm) {
                          performCustomerServiceSearch();
                        }
                      }}
                      disabled={isCustomerServiceLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        <Divider></ Divider>

        {/* ROW 6: Contact (Simple Search Interface) */}
        <Box marginBottom="extra-large">
          {/* View Mode: Simple Input Display */}
          {!isEditMode && (
            <Input
              label="Contact *"
              name="contact"
              placeholder="No contact selected"
              value={
                displayLabels.contact ||
                (formData.contact ? `Contact (${formData.contact})` : "")
              }
              readOnly={true}
            />
          )}

          {/* Edit Mode: Simple Search Interface */}
          {isEditMode && (
            <>
              <Flex gap="small" direction="row" align="end">
                <Box flex={1}>
                  <Input
                    label="Search Contacts *"
                    name="searchContacts"
                    placeholder="Enter contact name, email, or company..."
                    value={contactSearchTerm}
                    onChange={(value) => setContactSearchTerm(value)}
                    disabled={isContactLoading || isContactSearching}
                  />
                </Box>
                <Box>
                  <Button
                    onClick={performContactSearch}
                    disabled={!contactSearchTerm.trim() || isContactSearching || isContactLoading}
                  >
                    {isContactSearching ? <LoadingSpinner size="xs" /> : "🔍 Search"}
                  </Button>
                </Box>
                {lastContactSearchTerm && (
                  <Box>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearContactSearch}
                    >
                      ✕ Clear
                    </Button>
                  </Box>
                )}
              </Flex>

              {/* Search Results */}
              {lastContactSearchTerm && contacts.length > 1 && (
                <Box marginTop="small">
                  <Select
                    label="Select from search results"
                    name="contactSearchResults"
                    options={contacts}
                    value={formData.contact}
                    onChange={(value) => handleFieldChange("contact", value)}
                    disabled={isContactSearching}
                  />
                </Box>
              )}

              {/* Status Messages */}
              {getContactStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getContactStatusMessage()}
                </Text>
              )}

              {/* Error Messages */}
              {contactErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {contactErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setContactErrorMessage("");
                        if (lastContactSearchTerm) {
                          performContactSearch();
                        }
                      }}
                      disabled={isContactLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ROW 7: Campaign Type + Link to Google Drive */}
        <Box>
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* CAMPAIGN TYPE - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              {!isEditMode ? (
                <Input
                  label="Campaign Type *"
                  name="campaignType"
                  placeholder="No campaign type selected"
                  value={
                    displayLabels.campaignType ||
                    (formData.campaignType ? `Campaign Type (${formData.campaignType})` : "")
                  }
                  readOnly
                />
              ) : (
                <Select
                  label="Campaign Type *"
                  name="campaignType"
                  options={CAMPAIGN_TYPE_OPTIONS}
                  value={formData.campaignType}
                  onChange={(value) => handleFieldChange("campaignType", value)}
                  required
                />
              )}
            </Box>

            {/* LINK TO GOOGLE DRIVE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Link to Google Drive"
                name="linkToGoogleDrive"
                placeholder={isEditMode ? "Enter Google Drive link" : "No Google Drive link"}
                value={formData.linkToGoogleDrive}
                onChange={isEditMode ? (value) => handleFieldChange("linkToGoogleDrive", value) : undefined}
                readOnly={!isEditMode}
              />
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
});

export default BasicInformation;