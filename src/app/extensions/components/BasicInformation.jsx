// src/app/extensions/components/BasicInformation.jsx
// Enhanced version with save/load functionality - Based on Latest Codebase with Deal Owner Search

import React, { useState, useEffect, useCallback } from "react";
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
  COMMERCIAL_AGREEMENTS,
  DEAL_OWNER_OPTIONS,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const BasicInformation = ({ 
  formData, 
  onChange, 
  runServerless,
  context,
  onSaveStatusChange 
}) => {
  
  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  // === COMMERCIAL AGREEMENTS STATE ===
  const [agreements, setAgreements] = useState(COMMERCIAL_AGREEMENTS);
  const [agreementSearchTerm, setAgreementSearchTerm] = useState("");
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [isAgreementSearching, setIsAgreementSearching] = useState(false);
  const [hasAgreementLoaded, setHasAgreementLoaded] = useState(false);
  const [agreementErrorMessage, setAgreementErrorMessage] = useState("");
  const [useAgreementSearchMode, setUseAgreementSearchMode] = useState(false);
  const [agreementHasMore, setAgreementHasMore] = useState(false);
  const [companyStatus, setCompanyStatus] = useState("");

  // === ADVERTISERS STATE ===
  const [advertisers, setAdvertisers] = useState([{ label: "Select Advertiser", value: "" }]);
  const [advertiserSearchTerm, setAdvertiserSearchTerm] = useState("");
  const [isAdvertiserLoading, setIsAdvertiserLoading] = useState(false);
  const [isAdvertiserSearching, setIsAdvertiserSearching] = useState(false);
  const [hasAdvertiserLoaded, setHasAdvertiserLoaded] = useState(false);
  const [advertiserErrorMessage, setAdvertiserErrorMessage] = useState("");
  const [useAdvertiserSearchMode, setUseAdvertiserSearchMode] = useState(false);
  const [advertiserHasMore, setAdvertiserHasMore] = useState(false);

  // === DEAL OWNERS STATE (From Latest Codebase) ===
  const [dealOwners, setDealOwners] = useState(DEAL_OWNER_OPTIONS);
  const [dealOwnerSearchTerm, setDealOwnerSearchTerm] = useState("");
  const [isDealOwnerLoading, setIsDealOwnerLoading] = useState(false);
  const [isDealOwnerSearching, setIsDealOwnerSearching] = useState(false);
  const [hasDealOwnerLoaded, setHasDealOwnerLoaded] = useState(false);
  const [dealOwnerErrorMessage, setDealOwnerErrorMessage] = useState("");
  const [useDealOwnerSearchMode, setUseDealOwnerSearchMode] = useState(false);
  const [dealOwnerHasMore, setDealOwnerHasMore] = useState(false);

  // === COMPONENT INITIALIZATION ===
  
  // Load saved data on component mount
  useEffect(() => {
    if (context?.crm?.objectId && runServerless) {
      loadBasicInformation();
    }
  }, [context?.crm?.objectId, runServerless]);

  // Load default data for all search components
  useEffect(() => {
    if (runServerless && !hasAgreementLoaded) {
      loadDefaultAgreements();
    }
    if (runServerless && !hasAdvertiserLoaded) {
      loadDefaultAdvertisers();
    }
    if (runServerless && !hasDealOwnerLoaded) {
      loadDefaultDealOwners();
    }
  }, [runServerless, hasAgreementLoaded, hasAdvertiserLoaded, hasDealOwnerLoaded]);

  // Track form changes to detect unsaved modifications
  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED) {
      const hasChanges = Object.keys(initialFormData).some(key => 
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
  }, [formData, initialFormData, saveState, hasUnsavedChanges]);

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
        Object.keys(data.formData).forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Update search terms to match loaded values
        if (data.associations?.commercialAgreement) {
          setAgreementSearchTerm(data.associations.commercialAgreement.label);
        }
        if (data.associations?.advertiser) {
          setAdvertiserSearchTerm(data.associations.advertiser.label);
        }
        if (data.associations?.dealOwner) {
          setDealOwnerSearchTerm(data.associations.dealOwner.label);
        }

        // Store initial form data for change tracking
        setInitialFormData(data.formData);
        setLastSaved(data.metadata?.lastSaved);
        // ✅ Fixed: Check for 'Saved' with capital S
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.campaignName || data.formData.commercialAgreement)
          });
        }

        console.log("✅ Basic information loaded successfully");
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
          commercialAgreement: formData.commercialAgreement,
          advertiser: formData.advertiser,
          dealOwner: formData.dealOwner,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;
        
        // Update company/currency from response
        if (data.companyInfo) {
          onChange('company', data.companyInfo.companyName);
          onChange('currency', data.companyInfo.currency);
        }

        // Update tracking state
        setInitialFormData({ ...formData });
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: 'Saved', // ✅ Fixed: Use 'Saved' with capital S 
            lastSaved: data.savedAt,
            hasData: true
          });
        }

        console.log("✅ Basic information saved successfully");
      } else {
        throw new Error(response?.response?.message || "Failed to save data");
      }
    } catch (error) {
      console.error("❌ Error saving basic information:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  // === DEBOUNCE UTILITY ===
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // === COMMERCIAL AGREEMENTS FUNCTIONS ===
  
  const performAgreementSearch = async (term) => {
    if (!runServerless) return;

    setIsAgreementSearching(true);
    setAgreementErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          searchTerm: term,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
      } else {
        throw new Error("Invalid search response");
      }
    } catch (error) {
      console.error("Agreement search error:", error);
      setAgreementErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsAgreementSearching(false);
    }
  };

  const loadDefaultAgreements = async () => {
    if (!runServerless) return;

    setIsAgreementLoading(true);
    setAgreementErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          loadAll: false,
          limit: 20
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error loading agreements:", error);
      setAgreementErrorMessage(`Error: ${error.message}`);
      setAgreements(COMMERCIAL_AGREEMENTS);
    } finally {
      setIsAgreementLoading(false);
      setHasAgreementLoaded(true);
    }
  };

  // === ADVERTISERS FUNCTIONS ===
  
  const performAdvertiserSearch = async (term) => {
    if (!runServerless) return;

    setIsAdvertiserSearching(true);
    setAdvertiserErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchAdvertisers",
        parameters: {
          searchTerm: term,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAdvertisers(data.options || [{ label: "Select Advertiser", value: "" }]);
        setAdvertiserHasMore(data.hasMore || false);
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
    if (!runServerless) return;

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

  // === DEAL OWNERS FUNCTIONS (From Latest Codebase) ===

  const performDealOwnerSearch = async (term) => {
    if (!runServerless) return;

    setIsDealOwnerSearching(true);
    setDealOwnerErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchDealOwners",
        parameters: {
          searchTerm: term,
          page: 1,
          limit: 50,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setDealOwners(data.options || DEAL_OWNER_OPTIONS);
        setDealOwnerHasMore(data.hasMore || false);
        console.log(`🔍 Deal owner search results: ${data.totalCount} matches for "${term}"`);
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
    if (!runServerless) return;

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
        console.log(`✅ Loaded ${data.totalCount} default deal owners`);
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

  // === DEBOUNCED SEARCH FUNCTIONS ===
  
  const debouncedAgreementSearch = useCallback(
    debounce((term) => {
      if (term.trim() === "") {
        loadDefaultAgreements();
        setUseAgreementSearchMode(false);
      } else {
        performAgreementSearch(term.trim());
        setUseAgreementSearchMode(true);
      }
    }, 500),
    [runServerless]
  );

  const debouncedAdvertiserSearch = useCallback(
    debounce((term) => {
      if (term.trim() === "") {
        loadDefaultAdvertisers();
        setUseAdvertiserSearchMode(false);
      } else {
        performAdvertiserSearch(term.trim());
        setUseAdvertiserSearchMode(true);
      }
    }, 500),
    [runServerless]
  );

  const debouncedDealOwnerSearch = useCallback(
    debounce((term) => {
      if (term.trim() === "") {
        loadDefaultDealOwners();
        setUseDealOwnerSearchMode(false);
      } else {
        performDealOwnerSearch(term.trim());
        setUseDealOwnerSearchMode(true);
      }
    }, 500),
    [runServerless]
  );

  // === EVENT HANDLERS ===

  const handleAgreementSearchChange = (value) => {
    setAgreementSearchTerm(value);
    debouncedAgreementSearch(value);
  };

  const handleAdvertiserSearchChange = (value) => {
    setAdvertiserSearchTerm(value);
    debouncedAdvertiserSearch(value);
  };

  const handleDealOwnerSearchChange = (value) => {
    setDealOwnerSearchTerm(value);
    debouncedDealOwnerSearch(value);
  };

  const handleCommercialAgreementChange = (value) => {
    const selectedAgreement = agreements.find(agreement => agreement.value === value);
    
    onChange('commercialAgreement', value);
    
    if (selectedAgreement && selectedAgreement.value !== "") {
      setAgreementSearchTerm(selectedAgreement.label);
      setUseAgreementSearchMode(false);
      
      if (selectedAgreement.hasCompany === false) {
        onChange('company', 'No company found');
        onChange('currency', '');
      } else if (selectedAgreement.company && selectedAgreement.company !== 'No company found') {
        onChange('company', selectedAgreement.company);
        onChange('currency', selectedAgreement.currency || '');
      } else {
        onChange('company', 'Loading company...');
        setCompanyStatus("🔄 Fetching company information...");
        onChange('currency', '');
      }
    } else {
      onChange('company', '');
      onChange('currency', '');
      setCompanyStatus("");
    }
  };

  const handleAdvertiserChange = (value) => {
    const selectedAdvertiser = advertisers.find(advertiser => advertiser.value === value);
    
    onChange('advertiser', value);
    
    if (selectedAdvertiser && selectedAdvertiser.value !== "" && selectedAdvertiser.value !== "new") {
      setAdvertiserSearchTerm(selectedAdvertiser.label);
      setUseAdvertiserSearchMode(false);
    }
  };

  const handleDealOwnerChange = (value) => {
    const selectedDealOwner = dealOwners.find(owner => owner.value === value);
    
    onChange('dealOwner', value);
    
    if (selectedDealOwner && selectedDealOwner.value !== "") {
      setDealOwnerSearchTerm(selectedDealOwner.label);
      setUseDealOwnerSearchMode(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === 'commercialAgreement') {
      handleCommercialAgreementChange(value);
    } else if (field === 'advertiser') {
      handleAdvertiserChange(value);
    } else if (field === 'dealOwner') {
      handleDealOwnerChange(value);
    } else {
      onChange(field, value);
    }
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
    return saveState === COMPONENT_SAVE_STATES.NOT_SAVED || 
           saveState === COMPONENT_SAVE_STATES.MODIFIED ||
           saveState === COMPONENT_SAVE_STATES.ERROR;
  };

  const isSaveDisabled = () => {
    return saveState === COMPONENT_SAVE_STATES.SAVING ||
           saveState === COMPONENT_SAVE_STATES.LOADING ||
           !formData.campaignName ||
           !formData.commercialAgreement ||
           !formData.advertiser ||
           !formData.dealOwner;
  };

  // === MODE CONTROLS (for all search components) ===

  // Agreement mode controls
  const switchAgreementToBrowseMode = () => {
    setUseAgreementSearchMode(false);
    setAgreementSearchTerm("");
    loadDefaultAgreements();
  };

  const switchAgreementToSearchMode = () => {
    setUseAgreementSearchMode(true);
    setAgreementSearchTerm("");
  };

  const clearAgreementSelection = () => {
    setAgreementSearchTerm("");
    onChange('commercialAgreement', '');
    onChange('company', '');
    onChange('currency', '');
    setCompanyStatus("");
    setUseAgreementSearchMode(false);
    loadDefaultAgreements();
  };

  // Advertiser mode controls
  const switchAdvertiserToBrowseMode = () => {
    setUseAdvertiserSearchMode(false);
    setAdvertiserSearchTerm("");
    loadDefaultAdvertisers();
  };

  const switchAdvertiserToSearchMode = () => {
    setUseAdvertiserSearchMode(true);
    setAdvertiserSearchTerm("");
  };

  const clearAdvertiserSelection = () => {
    setAdvertiserSearchTerm("");
    onChange('advertiser', '');
    setUseAdvertiserSearchMode(false);
    loadDefaultAdvertisers();
  };

  // Deal owner mode controls
  const switchDealOwnerToBrowseMode = () => {
    setUseDealOwnerSearchMode(false);
    setDealOwnerSearchTerm("");
    loadDefaultDealOwners();
  };

  const switchDealOwnerToSearchMode = () => {
    setUseDealOwnerSearchMode(true);
    setDealOwnerSearchTerm("");
  };

  const clearDealOwnerSelection = () => {
    setDealOwnerSearchTerm("");
    onChange('dealOwner', '');
    setUseDealOwnerSearchMode(false);
    loadDefaultDealOwners();
  };

  // === STATUS MESSAGES ===

  const getAgreementStatusMessage = () => {
    if (isAgreementSearching) return "Searching agreements...";
    if (isAgreementLoading) return "Loading agreements...";
    if (useAgreementSearchMode && agreementSearchTerm) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} matches for "${agreementSearchTerm}"`;
    }
    if (agreements.length > 1) {
      const count = agreements.length - 1;
      return `${count} agreements available${agreementHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getAdvertiserStatusMessage = () => {
    if (isAdvertiserSearching) return "Searching advertisers...";
    if (isAdvertiserLoading) return "Loading advertisers...";
    if (useAdvertiserSearchMode && advertiserSearchTerm) {
      const count = advertisers.length > 1 ? advertisers.length - 1 : 0;
      return `${count} matches for "${advertiserSearchTerm}"`;
    }
    if (advertisers.length > 1) {
      const count = advertisers.length - 1;
      return `${count} advertisers available${advertiserHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getDealOwnerStatusMessage = () => {
    if (isDealOwnerSearching) return "Searching deal owners...";
    if (isDealOwnerLoading) return "Loading deal owners...";
    if (useDealOwnerSearchMode && dealOwnerSearchTerm) {
      const count = dealOwners.length > 1 ? dealOwners.length - 1 : 0;
      return `${count} matches for "${dealOwnerSearchTerm}"`;
    }
    if (dealOwners.length > 1) {
      const count = dealOwners.length - 1;
      return `${count} deal owners available${dealOwnerHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getCompanyInputStyle = () => {
    if (formData.company === 'No company found') {
      return { color: '#d73a49', fontStyle: 'italic' };
    } else if (formData.company && formData.company !== 'Loading company...') {
      return { color: '#28a745', fontWeight: '500' };
    }
    return {};
  };

  const statusDisplay = getSaveStatusDisplay();

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Basic Information</Heading>
        
        {/* Save Status Display */}
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
      </Flex>
      
      <Divider />

      {/* Save Error Alert */}
      {saveError && (
        <Box marginTop="small" marginBottom="medium">
          <Alert variant="error">
            {saveError}
          </Alert>
        </Box>
      )}
      
      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          <Box flex={1} minWidth="250px">
            <Input
              label="Campaign Name *"
              name="campaignName"
              placeholder="Enter campaign name"
              value={formData.campaignName}
              onChange={(value) => handleFieldChange("campaignName", value)}
              required
            />
          </Box>
          
          {/* COMMERCIAL AGREEMENTS SECTION */}
          <Box flex={1} minWidth="250px">
            <Flex gap="small" marginBottom="small">
              <Button
                variant={!useAgreementSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchAgreementToBrowseMode}
                disabled={isAgreementLoading}
              >
                📋 Browse
              </Button>
              <Button
                variant={useAgreementSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchAgreementToSearchMode}
                disabled={isAgreementLoading}
              >
                🔍 Search
              </Button>
              {(formData.commercialAgreement || agreementSearchTerm) && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearAgreementSelection}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>

            {useAgreementSearchMode ? (
              <Input
                label="Search Commercial Agreements *"
                name="searchAgreements"
                placeholder="Type agreement name to search..."
                value={agreementSearchTerm}
                onChange={handleAgreementSearchChange}
                disabled={isAgreementLoading || isAgreementSearching}
              />
            ) : (
              <Select
                label="Commercial Agreement *"
                name="commercialAgreement"
                options={agreements}
                value={formData.commercialAgreement}
                onChange={(value) => handleFieldChange("commercialAgreement", value)}
                required
                disabled={isAgreementLoading}
              />
            )}

            {useAgreementSearchMode && agreementSearchTerm && agreements.length > 1 && (
              <Box marginTop="small">
                <Select
                  label="Select from search results"
                  name="searchResults"
                  options={agreements}
                  value={formData.commercialAgreement}
                  onChange={(value) => handleFieldChange("commercialAgreement", value)}
                  disabled={isAgreementSearching}
                />
              </Box>
            )}

            {getAgreementStatusMessage() && (
              <Text variant="microcopy" format={{ color: 'medium' }}>
                {getAgreementStatusMessage()}
              </Text>
            )}
            
            {agreementErrorMessage && (
              <Box marginTop="extra-small">
                <Text variant="microcopy" format={{ color: 'error' }}>
                  {agreementErrorMessage}
                </Text>
                <Box marginTop="extra-small">
                  <Button 
                    variant="secondary" 
                    size="xs"
                    onClick={loadDefaultAgreements}
                    disabled={isAgreementLoading}
                  >
                    Retry
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Flex>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Input
                label="Company"
                name="company"
                placeholder="Auto-populated from agreement"
                value={formData.company}
                readOnly
                style={getCompanyInputStyle()}
              />
              
              {companyStatus && (
                <Box marginTop="extra-small">
                  <Text 
                    variant="microcopy" 
                    format={{ 
                      color: companyStatus.includes('No company') ? 'error' : 
                             companyStatus.includes('Company:') ? 'success' : 'medium'
                    }}
                  >
                    {companyStatus}
                  </Text>
                </Box>
              )}
            </Box>
            
            {/* ADVERTISERS SECTION */}
            <Box flex={1} minWidth="250px">
              <Flex gap="small" marginBottom="small">
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
                {(formData.advertiser || advertiserSearchTerm) && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={clearAdvertiserSelection}
                  >
                    ✕ Clear
                  </Button>
                )}
              </Flex>

              {useAdvertiserSearchMode ? (
                <Input
                  label="Search Advertisers *"
                  name="searchAdvertisers"
                  placeholder="Type advertiser name to search..."
                  value={advertiserSearchTerm}
                  onChange={handleAdvertiserSearchChange}
                  disabled={isAdvertiserLoading || isAdvertiserSearching}
                />
              ) : (
                <Select
                  label="Advertiser *"
                  name="advertiser"
                  options={advertisers}
                  value={formData.advertiser}
                  onChange={(value) => handleFieldChange("advertiser", value)}
                  required
                  disabled={isAdvertiserLoading}
                />
              )}

              {useAdvertiserSearchMode && advertiserSearchTerm && advertisers.length > 1 && (
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

              {getAdvertiserStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getAdvertiserStatusMessage()}
                </Text>
              )}
              
              {advertiserErrorMessage && (
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
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* DEAL OWNERS SECTION (From Latest Codebase) */}
            <Box flex={1} minWidth="250px">
              <Flex gap="small" marginBottom="small">
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
                {(formData.dealOwner || dealOwnerSearchTerm) && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={clearDealOwnerSelection}
                  >
                    ✕ Clear
                  </Button>
                )}
              </Flex>

              {useDealOwnerSearchMode ? (
                <Input
                  label="Search Deal Owners *"
                  name="searchDealOwners"
                  placeholder="Type owner name to search..."
                  value={dealOwnerSearchTerm}
                  onChange={handleDealOwnerSearchChange}
                  disabled={isDealOwnerLoading || isDealOwnerSearching}
                />
              ) : (
                <Select
                  label="Deal Owner *"
                  name="dealOwner"
                  options={dealOwners}
                  value={formData.dealOwner}
                  onChange={(value) => handleFieldChange("dealOwner", value)}
                  required
                  disabled={isDealOwnerLoading}
                />
              )}

              {useDealOwnerSearchMode && dealOwnerSearchTerm && dealOwners.length > 1 && (
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

              {getDealOwnerStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getDealOwnerStatusMessage()}
                </Text>
              )}
              
              {dealOwnerErrorMessage && (
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

            <Box flex={1} minWidth="250px">
              <Input
                label="Currency"
                name="currency"
                value={formData.currency}
                placeholder={formData.company === 'No company found' ? 'No currency available' : 'Auto-populated'}
                readOnly
              />
            </Box>
          </Flex>
        </Box>

        {/* Save Button */}
        {shouldShowSaveButton() && (
          <Box marginTop="medium">
            <Flex justify="end">
              <Button
                variant="primary"
                onClick={saveBasicInformation}
                disabled={isSaveDisabled()}
              >
                {saveState === COMPONENT_SAVE_STATES.SAVING ? "Saving..." : "💾 Save Basic Information"}
              </Button>
            </Flex>
          </Box>
        )}
      </Box>
    </Tile>
  );
};

export default BasicInformation;