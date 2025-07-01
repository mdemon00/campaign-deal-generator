// src/app/extensions/components/BasicInformation.jsx
// Phase 1: Removed progressive saving infrastructure

import React, { useState, useEffect } from "react";
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
  LoadingSpinner
} from "@hubspot/ui-extensions";

import {
  COMMERCIAL_AGREEMENTS,
  DEAL_OWNER_OPTIONS
} from '../utils/constants.js';

const BasicInformation = ({
  formData,
  onChange,
  runServerless,
  context,
  isEditMode = false
}) => {

  // === COMMERCIAL AGREEMENTS STATE ===
  const [agreements, setAgreements] = useState(COMMERCIAL_AGREEMENTS);
  const [agreementSearchTerm, setAgreementSearchTerm] = useState("");
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [isAgreementSearching, setIsAgreementSearching] = useState(false);
  const [agreementErrorMessage, setAgreementErrorMessage] = useState("");
  const [useAgreementSearchMode, setUseAgreementSearchMode] = useState(false);
  const [agreementHasMore, setAgreementHasMore] = useState(false);
  const [lastAgreementSearchTerm, setLastAgreementSearchTerm] = useState("");
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

  // === VIEW MODE DISPLAY LABELS ===
  const [displayLabels, setDisplayLabels] = useState({
    commercialAgreement: "",
    advertiser: "",
    dealOwner: ""
  });

  // === COMPONENT INITIALIZATION ===

  // Load default data for all search components (only in edit mode)
  useEffect(() => {
    if (runServerless && isEditMode) {
      loadDefaultAgreements(formData.commercialAgreement);
      if (!hasAdvertiserLoaded) {
        loadDefaultAdvertisers();
      }
      if (!hasDealOwnerLoaded) {
        loadDefaultDealOwners();
      }
    }
  }, [runServerless, isEditMode, formData.commercialAgreement, hasAdvertiserLoaded, hasDealOwnerLoaded]);

  // Update display labels for view mode
  useEffect(() => {
    if (!isEditMode) {
      updateDisplayLabelsForViewMode();
    } else {
      updateDisplayLabels();
    }
  }, [formData, agreements, advertisers, dealOwners, isEditMode]);

  // === DISPLAY LABEL FUNCTIONS ===
  const updateDisplayLabels = () => {
    if (!isEditMode) return;
    
    const newLabels = { ...displayLabels };

    // Commercial Agreement
    const selectedAgreement = agreements.find(a => a.value === formData.commercialAgreement);
    if (selectedAgreement) {
      newLabels.commercialAgreement = selectedAgreement.label;
    }

    // Advertiser
    const selectedAdvertiser = advertisers.find(a => a.value === formData.advertiser);
    if (selectedAdvertiser) {
      newLabels.advertiser = selectedAdvertiser.label;
    }

    // Deal Owner
    const selectedDealOwner = dealOwners.find(o => o.value === formData.dealOwner);
    if (selectedDealOwner) {
      newLabels.dealOwner = selectedDealOwner.label;
    }

    setDisplayLabels(newLabels);
  };

  const updateDisplayLabelsForViewMode = async () => {
    if (isEditMode) return;

    const newDisplayLabels = {};

    // For view mode, we need to fetch labels if we only have IDs
    if (formData.commercialAgreement && !displayLabels.commercialAgreement) {
      try {
        const agreementResponse = await runServerless({
          name: "searchCommercialAgreements",
          parameters: {
            selectedAgreementId: formData.commercialAgreement,
            limit: 1
          }
        });
        
        if (agreementResponse?.status === "SUCCESS" && agreementResponse?.response?.data) {
          const foundAgreement = agreementResponse.response.data.options?.find(
            opt => opt.value === formData.commercialAgreement
          );
          newDisplayLabels.commercialAgreement = foundAgreement?.label || `Agreement (${formData.commercialAgreement})`;
        } else {
          newDisplayLabels.commercialAgreement = `Agreement (${formData.commercialAgreement})`;
        }
      } catch (error) {
        newDisplayLabels.commercialAgreement = `Agreement (${formData.commercialAgreement})`;
      }
    }

    // Similar logic for advertiser and deal owner...
    if (formData.advertiser && !displayLabels.advertiser) {
      try {
        const advertiserResponse = await runServerless({
          name: "searchAdvertisers",
          parameters: { searchTerm: "", limit: 100 }
        });
        
        if (advertiserResponse?.status === "SUCCESS" && advertiserResponse?.response?.data) {
          const foundAdvertiser = advertiserResponse.response.data.options?.find(
            opt => opt.value === formData.advertiser
          );
          newDisplayLabels.advertiser = foundAdvertiser?.label || `Advertiser (${formData.advertiser})`;
        } else {
          newDisplayLabels.advertiser = `Advertiser (${formData.advertiser})`;
        }
      } catch (error) {
        newDisplayLabels.advertiser = `Advertiser (${formData.advertiser})`;
      }
    }

    if (formData.dealOwner && !displayLabels.dealOwner) {
      try {
        const ownerResponse = await runServerless({
          name: "searchDealOwners",
          parameters: { searchTerm: "", limit: 100 }
        });
        
        if (ownerResponse?.status === "SUCCESS" && ownerResponse?.response?.data) {
          const foundOwner = ownerResponse.response.data.options?.find(
            opt => opt.value === formData.dealOwner
          );
          newDisplayLabels.dealOwner = foundOwner?.label || `Owner (${formData.dealOwner})`;
        } else {
          newDisplayLabels.dealOwner = `Owner (${formData.dealOwner})`;
        }
      } catch (error) {
        newDisplayLabels.dealOwner = `Owner (${formData.dealOwner})`;
      }
    }

    if (Object.keys(newDisplayLabels).length > 0) {
      setDisplayLabels(prev => ({ ...prev, ...newDisplayLabels }));
    }
  };

  // === SEARCH FUNCTIONS (keeping existing logic) ===
  const performAgreementSearch = async () => {
    if (!runServerless || !isEditMode || !agreementSearchTerm.trim()) return;

    setIsAgreementSearching(true);
    setAgreementErrorMessage("");

    try {
      const searchTerm = agreementSearchTerm.trim();
      
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
        setUseAgreementSearchMode(true);
        setLastAgreementSearchTerm(searchTerm);
        
        console.log(`✅ Agreement search completed: ${data.totalCount} results for "${searchTerm}"`);
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

  const loadDefaultAgreements = async (initialSelectedAgreementId = "") => {
    if (!runServerless || !isEditMode) return;

    setIsAgreementLoading(true);
    setAgreementErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          loadAll: false,
          limit: 20,
          selectedAgreementId: initialSelectedAgreementId
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
    }
  };

  // === ADVERTISERS SEARCH FUNCTIONS ===
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
        
        console.log(`✅ Advertiser search completed: ${data.totalCount} results for "${searchTerm}"`);
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
        
        console.log(`✅ Deal owner search completed: ${data.totalCount} results for "${searchTerm}"`);
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

  // === EVENT HANDLERS ===
  const handleCommercialAgreementChange = (value) => {
    if (!isEditMode) return;

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
    if (!isEditMode) return;

    const selectedAdvertiser = advertisers.find(advertiser => advertiser.value === value);

    onChange('advertiser', value);

    if (selectedAdvertiser && selectedAdvertiser.value !== "" && selectedAdvertiser.value !== "new") {
      setAdvertiserSearchTerm(selectedAdvertiser.label);
      setUseAdvertiserSearchMode(false);
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

  const handleFieldChange = (field, value) => {
    if (!isEditMode) return;

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

  // === CLEAR SEARCH FUNCTIONS ===
  const clearAgreementSearch = () => {
    if (!isEditMode) return;
    setAgreementSearchTerm("");
    setUseAgreementSearchMode(false);
    setAgreementErrorMessage("");
    setLastAgreementSearchTerm("");
    loadDefaultAgreements(formData.commercialAgreement);
  };

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

  // === MODE CONTROL FUNCTIONS ===
  const switchAgreementToBrowseMode = () => {
    if (!isEditMode) return;
    setUseAgreementSearchMode(false);
    setAgreementSearchTerm("");
    setLastAgreementSearchTerm("");
    loadDefaultAgreements(formData.commercialAgreement);
  };

  const switchAgreementToSearchMode = () => {
    if (!isEditMode) return;
    setUseAgreementSearchMode(true);
    setAgreementSearchTerm("");
    setLastAgreementSearchTerm("");
  };

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

  // === STATUS MESSAGES ===
  const getAgreementStatusMessage = () => {
    if (!isEditMode) return "";
    if (isAgreementSearching) return "Searching agreements...";
    if (isAgreementLoading) return "Loading agreements...";
    if (useAgreementSearchMode && lastAgreementSearchTerm) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} results for "${lastAgreementSearchTerm}"`;
    }
    if (agreements.length > 1) {
      const count = agreements.length - 1;
      return `${count} agreements available${agreementHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

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

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Basic Information</Heading>

        {/* VIEW MODE INDICATOR */}
        {!isEditMode && (
          <Text variant="microcopy" format={{ color: 'medium' }}>
            👁️ View Mode - Read Only
          </Text>
        )}
      </Flex>

      <Divider />

      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          {/* CAMPAIGN NAME - VIEW/EDIT MODE */}
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

          {/* COMMERCIAL AGREEMENTS - VIEW/EDIT MODE */}
          <Box flex={1} minWidth="250px">
            {/* Mode Controls - Only show in Edit Mode */}
            {isEditMode && (
              <Flex gap="small" marginBottom="small" wrap="wrap">
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
                {useAgreementSearchMode && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={clearAgreementSearch}
                  >
                    ✕ Clear
                  </Button>
                )}
              </Flex>
            )}

            {/* View Mode: Simple Input Display */}
            {!isEditMode ? (
              <Input
                label="Commercial Agreement *"
                name="commercialAgreement"
                placeholder="No commercial agreement selected"
                value={
                  displayLabels.commercialAgreement || 
                  (formData.commercialAgreement ? `Agreement (${formData.commercialAgreement})` : "")
                }
                readOnly={true}
              />
            ) : (
              /* Edit Mode: Search or Select */
              <>
                {useAgreementSearchMode ? (
                  <Flex gap="small" direction="row" align="end">
                    <Box flex={1}>
                      <Input
                        label="Search Commercial Agreements *"
                        name="searchAgreements"
                        placeholder="Enter agreement name..."
                        value={agreementSearchTerm}
                        onChange={(value) => setAgreementSearchTerm(value)}
                        disabled={isAgreementLoading || isAgreementSearching}
                      />
                    </Box>
                    <Box>
                      <Button 
                        onClick={performAgreementSearch}
                        disabled={!agreementSearchTerm.trim() || isAgreementSearching || isAgreementLoading}
                      >
                        {isAgreementSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                      </Button>
                    </Box>
                  </Flex>
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

                {/* Search Results Select */}
                {useAgreementSearchMode && lastAgreementSearchTerm && agreements.length > 1 && (
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

                {/* Status Messages */}
                {getAgreementStatusMessage() && (
                  <Text variant="microcopy" format={{ color: 'medium' }}>
                    {getAgreementStatusMessage()}
                  </Text>
                )}

                {/* Error Messages */}
                {agreementErrorMessage && (
                  <Box marginTop="extra-small">
                    <Text variant="microcopy" format={{ color: 'error' }}>
                      {agreementErrorMessage}
                    </Text>
                    <Box marginTop="extra-small">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => loadDefaultAgreements(formData.commercialAgreement)}
                        disabled={isAgreementLoading}
                      >
                        Retry
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Flex>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* COMPANY - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Company"
                name="company"
                placeholder={isEditMode ? "Auto-populated from agreement" : "No company information"}
                value={formData.company}
                readOnly={true}
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

            {/* ADVERTISERS - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
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
              {!isEditMode ? (
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
              ) : (
                /* Edit Mode: Search or Select */
                <>
                  {useAdvertiserSearchMode ? (
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

                  {/* Search Results */}
                  {useAdvertiserSearchMode && lastAdvertiserSearchTerm && advertisers.length > 1 && (
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
                          onClick={loadDefaultAdvertisers}
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
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* DEAL OWNERS - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
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
              {!isEditMode ? (
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
              ) : (
                /* Edit Mode: Search or Select */
                <>
                  {useDealOwnerSearchMode ? (
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

                  {/* Search Results */}
                  {useDealOwnerSearchMode && lastDealOwnerSearchTerm && dealOwners.length > 1 && (
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
                          onClick={loadDefaultDealOwners}
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

            {/* CURRENCY - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Currency"
                name="currency"
                value={formData.currency}
                placeholder={
                  !isEditMode ? "No currency information" :
                  formData.company === 'No company found' ? 'No currency available' : 'Auto-populated'
                }
                readOnly={true}
              />
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
};

export default BasicInformation;