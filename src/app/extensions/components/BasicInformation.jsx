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
  const [useAdvertiserSearchMode, setUseAdvertiserSearchMode] = useState(false);
  const [advertiserHasMore, setAdvertiserHasMore] = useState(false);
  const [lastAdvertiserSearchTerm, setLastAdvertiserSearchTerm] = useState("");

  // === DEAL OWNERS STATE ===
  const [dealOwners, setDealOwners] = useState(DEAL_OWNER_OPTIONS);
  const [dealOwnerSearchTerm, setDealOwnerSearchTerm] = useState("");
  const [isDealOwnerLoading, setIsDealOwnerLoading] = useState(false);
  const [isDealOwnerSearching, setIsDealOwnerSearching] = useState(false);
  const [hasDealOwnerLoaded, setHasDealOwnerLoaded] = useState(false);
  const [dealOwnerErrorMessage, setDealOwnerErrorMessage] = useState("");
  const [useDealOwnerSearchMode, setUseDealOwnerSearchMode] = useState(false);
  const [dealOwnerHasMore, setDealOwnerHasMore] = useState(false);
  const [lastDealOwnerSearchTerm, setLastDealOwnerSearchTerm] = useState("");

  // === ASSIGNED CUSTOMER SERVICE STATE ===
  const [customerServices, setCustomerServices] = useState([{ label: "Select CS Representative", value: "" }]);
  const [customerServiceSearchTerm, setCustomerServiceSearchTerm] = useState("");
  const [isCustomerServiceLoading, setIsCustomerServiceLoading] = useState(false);
  const [isCustomerServiceSearching, setIsCustomerServiceSearching] = useState(false);
  const [hasCustomerServiceLoaded, setHasCustomerServiceLoaded] = useState(false);
  const [customerServiceErrorMessage, setCustomerServiceErrorMessage] = useState("");
  const [useCustomerServiceSearchMode, setUseCustomerServiceSearchMode] = useState(false);
  const [customerServiceHasMore, setCustomerServiceHasMore] = useState(false);
  const [lastCustomerServiceSearchTerm, setLastCustomerServiceSearchTerm] = useState("");

  // === CONTACTS STATE ===
  const [contacts, setContacts] = useState([{ label: "Select Contact", value: "" }]);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [isContactSearching, setIsContactSearching] = useState(false);
  const [hasContactLoaded, setHasContactLoaded] = useState(false);
  const [contactErrorMessage, setContactErrorMessage] = useState("");
  const [useContactSearchMode, setUseContactSearchMode] = useState(false);
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
      if (!hasAdvertiserLoaded) {
        loadDefaultAdvertisers();
      }
      if (!hasDealOwnerLoaded) {
        loadDefaultDealOwners();
      }
      if (!hasCustomerServiceLoaded) {
        loadDefaultCustomerServices();
      }
      if (!hasContactLoaded) {
        loadDefaultContacts();
      }
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
      const basicFields = ['campaignName', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
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
        const basicFields = ['campaignName', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
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
            hasData: !!(data.formData.campaignName || data.formData.advertiser)
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
        const basicFields = ['campaignName', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
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
        setUseAdvertiserSearchMode(true);
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

  const loadDefaultAdvertisers = async () => {
    if (!runServerless || !isEditMode) return;

    setIsAdvertiserLoading(true);
    setAdvertiserErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchAdvertisers",
        parameters: {
          loadAll: false,
          limit: 20
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAdvertisers(data.options || [{ label: "Select Advertiser", value: "" }]);
        setAdvertiserHasMore(data.hasMore || false);
      } else {
        throw new Error("Invalid response from advertiser server");
      }
    } catch (error) {
      console.error("Error loading advertisers:", error);
      setAdvertiserErrorMessage(`Error: ${error.message}`);
      setAdvertisers([
        { label: "Select Advertiser", value: "" },
        { label: "Lancome", value: "lancome" },
        { label: "L'Oreal", value: "loreal" },
      ]);
    } finally {
      setIsAdvertiserLoading(false);
      setHasAdvertiserLoaded(true);
    }
  };

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
        setUseDealOwnerSearchMode(true);
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

  const loadDefaultDealOwners = async () => {
    if (!runServerless || !isEditMode) return;

    setIsDealOwnerLoading(true);
    setDealOwnerErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchDealOwners",
        parameters: {
          loadAll: false,
          limit: 20,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setDealOwners(data.options || DEAL_OWNER_OPTIONS);
        setDealOwnerHasMore(data.hasMore || false);
        console.log('🔍 [DEFAULT] Loaded default deal owners:', data.options?.length || 0);
      } else {
        throw new Error("Invalid response from deal owner server");
      }
    } catch (error) {
      console.error("Error loading deal owners:", error);
      setDealOwnerErrorMessage(`Error: ${error.message}`);
      setDealOwners(DEAL_OWNER_OPTIONS);
    } finally {
      setIsDealOwnerLoading(false);
      setHasDealOwnerLoaded(true);
    }
  };

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
        // Update labels to reflect CS role
        const options = data.options.map(option => ({
          ...option,
          label: option.label === "Select Deal Owner" ? "Select CS Representative" : option.label
        }));
        setCustomerServices(options);
        setCustomerServiceHasMore(data.hasMore || false);
        setUseCustomerServiceSearchMode(true);
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

  const loadDefaultCustomerServices = async () => {
    if (!runServerless || !isEditMode) return;

    setIsCustomerServiceLoading(true);
    setCustomerServiceErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchDealOwners", // Reuse deal owners for customer service
        parameters: {
          loadAll: false,
          limit: 20,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        // Update labels to reflect CS role
        const options = data.options.map(option => ({
          ...option,
          label: option.label === "Select Deal Owner" ? "Select CS Representative" : option.label
        }));
        setCustomerServices(options);
        setCustomerServiceHasMore(data.hasMore || false);
        console.log('🔍 [DEFAULT] Loaded default customer services:', options?.length || 0);
      } else {
        throw new Error("Invalid response from customer service server");
      }
    } catch (error) {
      console.error("Error loading customer services:", error);
      setCustomerServiceErrorMessage(`Error: ${error.message}`);
      setCustomerServices([{ label: "Select CS Representative", value: "" }]);
    } finally {
      setIsCustomerServiceLoading(false);
      setHasCustomerServiceLoaded(true);
    }
  };

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
        setUseContactSearchMode(true);
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

  const loadDefaultContacts = async () => {
    if (!runServerless || !isEditMode) return;

    setIsContactLoading(true);
    setContactErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchContacts",
        parameters: {
          loadAll: false,
          limit: 20,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setContacts(data.options || [{ label: "Select Contact", value: "" }]);
        setContactHasMore(data.hasMore || false);
        console.log('🔍 [DEFAULT] Loaded default contacts:', data.options?.length || 0);
      } else {
        throw new Error("Invalid response from contact server");
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      setContactErrorMessage(`Error: ${error.message}`);
      setContacts([{ label: "Select Contact", value: "" }]);
    } finally {
      setIsContactLoading(false);
      setHasContactLoaded(true);
    }
  };

  // === EVENT HANDLERS ===
  const handleAdvertiserChange = (value) => {
    if (!isEditMode) return;

    const selectedAdvertiser = advertisers.find(advertiser => advertiser.value === value);

    onChange('advertiser', value);

    if (selectedAdvertiser && selectedAdvertiser.value !== "" && selectedAdvertiser.value !== "new") {
      setAdvertiserSearchTerm(selectedAdvertiser.label);
      setUseAdvertiserSearchMode(false);

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
      setUseDealOwnerSearchMode(false);
    }
  };

  const handleCustomerServiceChange = (value) => {
    if (!isEditMode) return;

    const selectedCS = customerServices.find(cs => cs.value === value);

    onChange('assignedCustomerService', value);

    if (selectedCS && selectedCS.value !== "") {
      setCustomerServiceSearchTerm(selectedCS.label);
      setUseCustomerServiceSearchMode(false);
    }
  };

  const handleContactChange = (value) => {
    if (!isEditMode) return;

    const selectedContact = contacts.find(contact => contact.value === value);

    onChange('contact', value);

    if (selectedContact && selectedContact.value !== "") {
      setContactSearchTerm(selectedContact.label);
      setUseContactSearchMode(false);
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
    setUseAdvertiserSearchMode(false);
    setAdvertiserErrorMessage("");
    setLastAdvertiserSearchTerm("");
    loadDefaultAdvertisers();
  };

  const clearDealOwnerSearch = () => {
    if (!isEditMode) return;
    setDealOwnerSearchTerm("");
    setUseDealOwnerSearchMode(false);
    setDealOwnerErrorMessage("");
    setLastDealOwnerSearchTerm("");
    loadDefaultDealOwners();
  };

  const clearCustomerServiceSearch = () => {
    if (!isEditMode) return;
    setCustomerServiceSearchTerm("");
    setUseCustomerServiceSearchMode(false);
    setCustomerServiceErrorMessage("");
    setLastCustomerServiceSearchTerm("");
    loadDefaultCustomerServices();
  };

  const clearContactSearch = () => {
    if (!isEditMode) return;
    setContactSearchTerm("");
    setUseContactSearchMode(false);
    setContactErrorMessage("");
    setLastContactSearchTerm("");
    loadDefaultContacts();
  };

  // === MODE CONTROL FUNCTIONS ===
  const switchAdvertiserToBrowseMode = () => {
    if (!isEditMode) return;
    setUseAdvertiserSearchMode(false);
    setAdvertiserSearchTerm("");
    setLastAdvertiserSearchTerm("");
    loadDefaultAdvertisers();
  };

  const switchAdvertiserToSearchMode = () => {
    if (!isEditMode) return;
    setUseAdvertiserSearchMode(true);
    setAdvertiserSearchTerm("");
    setLastAdvertiserSearchTerm("");
  };

  const switchDealOwnerToBrowseMode = () => {
    if (!isEditMode) return;
    setUseDealOwnerSearchMode(false);
    setDealOwnerSearchTerm("");
    setLastDealOwnerSearchTerm("");
    loadDefaultDealOwners();
  };

  const switchDealOwnerToSearchMode = () => {
    if (!isEditMode) return;
    setUseDealOwnerSearchMode(true);
    setDealOwnerSearchTerm("");
    setLastDealOwnerSearchTerm("");
  };

  const switchCustomerServiceToBrowseMode = () => {
    if (!isEditMode) return;
    setUseCustomerServiceSearchMode(false);
    setCustomerServiceSearchTerm("");
    setLastCustomerServiceSearchTerm("");
    loadDefaultCustomerServices();
  };

  const switchCustomerServiceToSearchMode = () => {
    if (!isEditMode) return;
    setUseCustomerServiceSearchMode(true);
    setCustomerServiceSearchTerm("");
    setLastCustomerServiceSearchTerm("");
  };

  const switchContactToBrowseMode = () => {
    if (!isEditMode) return;
    setUseContactSearchMode(false);
    setContactSearchTerm("");
    setLastContactSearchTerm("");
    loadDefaultContacts();
  };

  const switchContactToSearchMode = () => {
    if (!isEditMode) return;
    setUseContactSearchMode(true);
    setContactSearchTerm("");
    setLastContactSearchTerm("");
  };

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
    if (useAdvertiserSearchMode && lastAdvertiserSearchTerm) {
      const count = advertisers.length > 1 ? advertisers.length - 1 : 0;
      return `${count} results for "${lastAdvertiserSearchTerm}"`;
    }
    if (advertisers.length > 1) {
      const count = advertisers.length - 1;
      return `${count} advertisers available${advertiserHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getDealOwnerStatusMessage = () => {
    if (!isEditMode) return "";
    if (isDealOwnerSearching) return "Searching deal owners...";
    if (isDealOwnerLoading) return "Loading deal owners...";
    if (useDealOwnerSearchMode && lastDealOwnerSearchTerm) {
      const count = dealOwners.length > 1 ? dealOwners.length - 1 : 0;
      return `${count} results for "${lastDealOwnerSearchTerm}"`;
    }
    if (dealOwners.length > 1) {
      const count = dealOwners.length - 1;
      return `${count} deal owners available${dealOwnerHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getCustomerServiceStatusMessage = () => {
    if (!isEditMode) return "";
    if (isCustomerServiceSearching) return "Searching CS representatives...";
    if (isCustomerServiceLoading) return "Loading CS representatives...";
    if (useCustomerServiceSearchMode && lastCustomerServiceSearchTerm) {
      const count = customerServices.length > 1 ? customerServices.length - 1 : 0;
      return `${count} results for "${lastCustomerServiceSearchTerm}"`;
    }
    if (customerServices.length > 1) {
      const count = customerServices.length - 1;
      return `${count} CS representatives available${customerServiceHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getContactStatusMessage = () => {
    if (!isEditMode) return "";
    if (isContactSearching) return "Searching contacts...";
    if (isContactLoading) return "Loading contacts...";
    if (useContactSearchMode && lastContactSearchTerm) {
      const count = contacts.length > 1 ? contacts.length - 1 : 0;
      return `${count} results for "${lastContactSearchTerm}"`;
    }
    if (contacts.length > 1) {
      const count = contacts.length - 1;
      return `${count} contacts available${contactHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const statusDisplay = getSaveStatusDisplay();

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Validate required fields
      const requiredFields = ['campaignName', 'advertiser', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType'];
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
        {/* ROW 1: Campaign Name (Full Row) */}
        <Box marginBottom="extra-large">
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

        {/* ROW 2: Advertiser (Full Row - Has Browse/Search) */}
        <Box marginBottom="extra-large">
          {/* Mode Controls - Only show in Edit Mode */}
          {isEditMode && (
            <Flex gap="small" marginBottom="small" wrap="wrap">
              <Button
                variant={!useAdvertiserSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchAdvertiserToBrowseMode}
                disabled={isAdvertiserLoading}
              >
                📋 Browse
              </Button>
              <Button
                variant={useAdvertiserSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchAdvertiserToSearchMode}
                disabled={isAdvertiserLoading}
              >
                🔍 Search
              </Button>
              {useAdvertiserSearchMode && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearAdvertiserSearch}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>
          )}

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

          {/* Edit Mode: Search or Select */}
          {isEditMode && useAdvertiserSearchMode ? (
            <Flex gap="small" direction="row" align="end">
              <Box flex={1}>
                <Input
                  label="Search Advertisers *"
                  name="searchAdvertisers"
                  placeholder="Enter advertiser name..."
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
                  {isAdvertiserSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                </Button>
              </Box>
            </Flex>
          ) : isEditMode ? (
            <Select
              label="Advertiser *"
              name="advertiser"
              options={advertisers}
              value={formData.advertiser}
              onChange={(value) => handleFieldChange("advertiser", value)}
              required
              disabled={isAdvertiserLoading}
            />
          ) : null}

          {/* Search Results - Only in Edit Mode */}
          {isEditMode && useAdvertiserSearchMode && lastAdvertiserSearchTerm && advertisers.length > 1 && (
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

          {/* Status Messages - Only in Edit Mode */}
          {getAdvertiserStatusMessage() && (
            <Text variant="microcopy" format={{ color: 'medium' }}>
              {getAdvertiserStatusMessage()}
            </Text>
          )}

          {/* Error Messages - Only in Edit Mode */}
          {isEditMode && advertiserErrorMessage && (
            <Box marginTop="extra-small">
              <Text variant="microcopy" format={{ color: 'error' }}>
                {advertiserErrorMessage}
              </Text>
              <Box marginTop="extra-small">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={loadDefaultAdvertisers}
                  disabled={isAdvertiserLoading}
                >
                  Retry
                </Button>
              </Box>
            </Box>
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

        {/* ROW 4: Deal Owner (Full Row - Has Browse/Search) */}
        <Box marginBottom="extra-large">
          {/* Mode Controls - Only show in Edit Mode */}
          {isEditMode && (
            <Flex gap="small" marginBottom="small" wrap="wrap">
              <Button
                variant={!useDealOwnerSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchDealOwnerToBrowseMode}
                disabled={isDealOwnerLoading}
              >
                📋 Browse
              </Button>
              <Button
                variant={useDealOwnerSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchDealOwnerToSearchMode}
                disabled={isDealOwnerLoading}
              >
                🔍 Search
              </Button>
              {useDealOwnerSearchMode && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearDealOwnerSearch}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>
          )}

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

          {/* Edit Mode: Search or Select */}
          {isEditMode && useDealOwnerSearchMode ? (
            <Flex gap="small" direction="row" align="end">
              <Box flex={1}>
                <Input
                  label="Search Deal Owners *"
                  name="searchDealOwners"
                  placeholder="Enter owner name..."
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
                  {isDealOwnerSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                </Button>
              </Box>
            </Flex>
          ) : isEditMode ? (
            <Select
              label="Deal Owner *"
              name="dealOwner"
              options={dealOwners}
              value={formData.dealOwner}
              onChange={(value) => handleFieldChange("dealOwner", value)}
              required
              disabled={isDealOwnerLoading}
            />
          ) : null}

          {/* Search Results - Only in Edit Mode */}
          {isEditMode && useDealOwnerSearchMode && lastDealOwnerSearchTerm && dealOwners.length > 1 && (
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

          {/* Status Messages - Only in Edit Mode */}
          {getDealOwnerStatusMessage() && (
            <Text variant="microcopy" format={{ color: 'medium' }}>
              {getDealOwnerStatusMessage()}
            </Text>
          )}

          {/* Error Messages - Only in Edit Mode */}
          {isEditMode && dealOwnerErrorMessage && (
            <Box marginTop="extra-small">
              <Text variant="microcopy" format={{ color: 'error' }}>
                {dealOwnerErrorMessage}
              </Text>
              <Box marginTop="extra-small">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={loadDefaultDealOwners}
                  disabled={isDealOwnerLoading}
                >
                  Retry
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* ROW 5: Assigned Customer Service (Full Row - Has Browse/Search) */}
        <Box marginBottom="extra-large">
          {/* Mode Controls - Only show in Edit Mode */}
          {isEditMode && (
            <Flex gap="small" marginBottom="small" wrap="wrap">
              <Button
                variant={!useCustomerServiceSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchCustomerServiceToBrowseMode}
                disabled={isCustomerServiceLoading}
              >
                📋 Browse
              </Button>
              <Button
                variant={useCustomerServiceSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchCustomerServiceToSearchMode}
                disabled={isCustomerServiceLoading}
              >
                🔍 Search
              </Button>
              {useCustomerServiceSearchMode && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearCustomerServiceSearch}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>
          )}

          {/* View Mode: Simple Input Display */}
          {!isEditMode && (
            <Input
              label="Assigned Customer Service *"
              name="assignedCustomerService"
              placeholder="No CS representative selected"
              value={
                displayLabels.assignedCustomerService || 
                (formData.assignedCustomerService ? `CS Rep (${formData.assignedCustomerService})` : "")
              }
              readOnly={true}
            />
          )}

          {/* Edit Mode: Search or Select */}
          {isEditMode && useCustomerServiceSearchMode ? (
            <Flex gap="small" direction="row" align="end">
              <Box flex={1}>
                <Input
                  label="Search CS Representatives *"
                  name="searchCustomerService"
                  placeholder="Enter CS rep name..."
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
                  {isCustomerServiceSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                </Button>
              </Box>
            </Flex>
          ) : isEditMode ? (
            <Select
              label="Assigned Customer Service *"
              name="assignedCustomerService"
              options={customerServices}
              value={formData.assignedCustomerService}
              onChange={(value) => handleFieldChange("assignedCustomerService", value)}
              required
              disabled={isCustomerServiceLoading}
            />
          ) : null}

          {/* Search Results - Only in Edit Mode */}
          {isEditMode && useCustomerServiceSearchMode && lastCustomerServiceSearchTerm && customerServices.length > 1 && (
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

          {/* Status Messages - Only in Edit Mode */}
          {getCustomerServiceStatusMessage() && (
            <Text variant="microcopy" format={{ color: 'medium' }}>
              {getCustomerServiceStatusMessage()}
            </Text>
          )}

          {/* Error Messages - Only in Edit Mode */}
          {isEditMode && customerServiceErrorMessage && (
            <Box marginTop="extra-small">
              <Text variant="microcopy" format={{ color: 'error' }}>
                {customerServiceErrorMessage}
              </Text>
              <Box marginTop="extra-small">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={loadDefaultCustomerServices}
                  disabled={isCustomerServiceLoading}
                >
                  Retry
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* ROW 6: Contact (Full Row - Has Browse/Search) */}
        <Box marginBottom="extra-large">
          {/* Mode Controls - Only show in Edit Mode */}
          {isEditMode && (
            <Flex gap="small" marginBottom="small" wrap="wrap">
              <Button
                variant={!useContactSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchContactToBrowseMode}
                disabled={isContactLoading}
              >
                📋 Browse
              </Button>
              <Button
                variant={useContactSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchContactToSearchMode}
                disabled={isContactLoading}
              >
                🔍 Search
              </Button>
              {useContactSearchMode && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearContactSearch}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>
          )}

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

          {/* Edit Mode: Search or Select */}
          {isEditMode && useContactSearchMode ? (
            <Flex gap="small" direction="row" align="end">
              <Box flex={1}>
                <Input
                  label="Search Contacts *"
                  name="searchContacts"
                  placeholder="Enter contact name..."
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
                  {isContactSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                </Button>
              </Box>
            </Flex>
          ) : isEditMode ? (
            <Select
              label="Contact *"
              name="contact"
              options={contacts}
              value={formData.contact}
              onChange={(value) => handleFieldChange("contact", value)}
              required
              disabled={isContactLoading}
            />
          ) : null}

          {/* Search Results - Only in Edit Mode */}
          {isEditMode && useContactSearchMode && lastContactSearchTerm && contacts.length > 1 && (
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

          {/* Status Messages - Only in Edit Mode */}
          {getContactStatusMessage() && (
            <Text variant="microcopy" format={{ color: 'medium' }}>
              {getContactStatusMessage()}
            </Text>
          )}

          {/* Error Messages - Only in Edit Mode */}
          {isEditMode && contactErrorMessage && (
            <Box marginTop="extra-small">
              <Text variant="microcopy" format={{ color: 'error' }}>
                {contactErrorMessage}
              </Text>
              <Box marginTop="extra-small">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={loadDefaultContacts}
                  disabled={isContactLoading}
                >
                  Retry
                </Button>
              </Box>
            </Box>
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