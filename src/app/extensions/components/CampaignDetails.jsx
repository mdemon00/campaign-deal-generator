// src/app/extensions/components/CampaignDetails.jsx
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
  CAMPAIGN_TYPE_OPTIONS,
  DEAL_CS_OPTIONS
} from '../utils/constants.js';

const CampaignDetails = ({
  formData,
  onChange,
  runServerless,
  context,
  isEditMode = false
}) => {

  // === DEAL CS STATE ===
  const [dealCS, setDealCS] = useState(DEAL_CS_OPTIONS);
  const [dealCSSearchTerm, setDealCSSearchTerm] = useState("");
  const [isDealCSLoading, setIsDealCSLoading] = useState(false);
  const [isDealCSSearching, setIsDealCSSearching] = useState(false);
  const [hasDealCSLoaded, setHasDealCSLoaded] = useState(false);
  const [dealCSErrorMessage, setDealCSErrorMessage] = useState("");
  const [useDealCSSearchMode, setUseDealCSSearchMode] = useState(false);
  const [dealCSHasMore, setDealCSHasMore] = useState(false);
  const [lastDealCSSearchTerm, setLastDealCSSearchTerm] = useState("");

  // === VIEW MODE DISPLAY LABELS ===
  const [displayLabels, setDisplayLabels] = useState({
    campaignType: "",
    dealCS: ""
  });

  // === COMPONENT INITIALIZATION ===

  // Load default Deal CS data (only in edit mode)
  useEffect(() => {
    if (runServerless && isEditMode && !hasDealCSLoaded) {
      loadDefaultDealCS();
    }
  }, [runServerless, isEditMode, hasDealCSLoaded]);

  // Update display labels
  useEffect(() => {
    if (!isEditMode) {
      updateDisplayLabelsForViewMode();
    } else {
      updateDisplayLabels();
    }
  }, [formData, dealCS, isEditMode]);

  // === DISPLAY LABEL FUNCTIONS ===
  const updateDisplayLabels = () => {
    if (!isEditMode) return;
    
    const newLabels = { ...displayLabels };

    // Campaign Type
    const selectedCampaignType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === formData.campaignType);
    if (selectedCampaignType) {
      newLabels.campaignType = selectedCampaignType.label;
    }

    // Deal CS
    const selectedDealCS = dealCS.find(cs => cs.value === formData.dealCS);
    if (selectedDealCS) {
      newLabels.dealCS = selectedDealCS.label;
    }

    setDisplayLabels(newLabels);
  };

  const updateDisplayLabelsForViewMode = async () => {
    if (isEditMode) return;

    const newDisplayLabels = {};

    // Campaign Type - find from constants
    const selectedCampaignType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === formData.campaignType);
    newDisplayLabels.campaignType = selectedCampaignType?.label || formData.campaignType || "";

    // Deal CS - Handle association data OR fallback gracefully
    if (formData.dealCS && !displayLabels.dealCS) {
      try {
        const dealCSLookupResponse = await runServerless({
          name: "searchDealOwners",
          parameters: {
            searchTerm: "",
            loadAll: false,
            limit: 100
          }
        });
        
        if (dealCSLookupResponse?.status === "SUCCESS" && dealCSLookupResponse?.response?.data) {
          const dealCSOptions = dealCSLookupResponse.response.data.options || [];
          const foundDealCS = dealCSOptions.find(cs => cs.value === formData.dealCS);
          
          if (foundDealCS) {
            newDisplayLabels.dealCS = foundDealCS.label;
          } else {
            newDisplayLabels.dealCS = `CS Representative (${formData.dealCS})`;
          }
        } else {
          newDisplayLabels.dealCS = `CS Representative (${formData.dealCS})`;
        }
      } catch (lookupError) {
        console.warn("Could not lookup Deal CS details for view mode:", lookupError);
        newDisplayLabels.dealCS = `CS Representative (${formData.dealCS})`;
      }
    }
    
    if (Object.keys(newDisplayLabels).length > 0) {
      setDisplayLabels(prev => ({ ...prev, ...newDisplayLabels }));
    }
  };

  // === DEAL CS SEARCH FUNCTIONS ===
  const performDealCSSearch = async () => {
    if (!runServerless || !isEditMode || !dealCSSearchTerm.trim()) return;

    setIsDealCSSearching(true);
    setDealCSErrorMessage("");

    try {
      const searchTerm = dealCSSearchTerm.trim();
      
      const response = await runServerless({
        name: "searchDealOwners", // Reuse existing function
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        
        // Update labels to reflect CS context
        const csOptions = data.options.map(option => ({
          ...option,
          label: option.label === "Select Deal Owner" ? "Select CS Representative" : option.label
        }));
        
        setDealCS(csOptions);
        setDealCSHasMore(data.hasMore || false);
        setUseDealCSSearchMode(true);
        setLastDealCSSearchTerm(searchTerm);
        
        console.log(`✅ Deal CS search completed: ${data.totalCount} results for "${searchTerm}"`);
      } else {
        throw new Error("Invalid deal CS search response");
      }
    } catch (error) {
      console.error("Deal CS search error:", error);
      setDealCSErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsDealCSSearching(false);
    }
  };

  const loadDefaultDealCS = async () => {
    if (!runServerless || !isEditMode) return;

    setIsDealCSLoading(true);
    setDealCSErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchDealOwners", // Reuse existing function
        parameters: {
          loadAll: false,
          limit: 20,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        
        // Update labels to reflect CS context
        const csOptions = data.options.map(option => ({
          ...option,
          label: option.label === "Select Deal Owner" ? "Select CS Representative" : option.label
        }));
        
        setDealCS(csOptions);
        setDealCSHasMore(data.hasMore || false);
        console.log(`✅ Loaded ${data.totalCount} default deal CS representatives`);
      } else {
        throw new Error("Invalid response from deal CS server");
      }
    } catch (error) {
      console.error("Error loading deal CS:", error);
      setDealCSErrorMessage(`Error: ${error.message}`);
      setDealCS(DEAL_CS_OPTIONS);
    } finally {
      setIsDealCSLoading(false);
      setHasDealCSLoaded(true);
    }
  };

  // === EVENT HANDLERS ===
  const handleDealCSChange = (value) => {
    if (!isEditMode) return;

    const selectedDealCS = dealCS.find(cs => cs.value === value);

    onChange('dealCS', value);

    if (selectedDealCS && selectedDealCS.value !== "") {
      setDealCSSearchTerm(selectedDealCS.label);
      setUseDealCSSearchMode(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (!isEditMode) return;

    if (field === 'dealCS') {
      handleDealCSChange(value);
    } else {
      onChange(field, value);
    }
  };

  // === CLEAR SEARCH FUNCTIONS ===
  const clearDealCSSearch = () => {
    if (!isEditMode) return;
    setDealCSSearchTerm("");
    setUseDealCSSearchMode(false);
    setDealCSErrorMessage("");
    setLastDealCSSearchTerm("");
    loadDefaultDealCS();
  };

  // === MODE CONTROL FUNCTIONS ===
  const switchDealCSToBrowseMode = () => {
    if (!isEditMode) return;
    setUseDealCSSearchMode(false);
    setDealCSSearchTerm("");
    setLastDealCSSearchTerm("");
    loadDefaultDealCS();
  };

  const switchDealCSToSearchMode = () => {
    if (!isEditMode) return;
    setUseDealCSSearchMode(true);
    setDealCSSearchTerm("");
    setLastDealCSSearchTerm("");
  };

  // === STATUS MESSAGES ===
  const getDealCSStatusMessage = () => {
    if (!isEditMode) return "";
    if (isDealCSSearching) return "Searching CS representatives...";
    if (isDealCSLoading) return "Loading CS representatives...";
    if (useDealCSSearchMode && lastDealCSSearchTerm) {
      const count = dealCS.length > 1 ? dealCS.length - 1 : 0;
      return `${count} results for "${lastDealCSSearchTerm}"`;
    }
    if (dealCS.length > 1) {
      const count = dealCS.length - 1;
      return `${count} CS representatives available${dealCSHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Campaign Details</Heading>

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
          {/* CAMPAIGN TYPE - VIEW/EDIT MODE */}
          <Box flex={1} minWidth="250px">
            {/* View Mode: Simple Input Display */}
            {!isEditMode ? (
              <Input
                label="Campaign Type *"
                name="campaignType"
                placeholder="No campaign type selected"
                value={
                  displayLabels.campaignType || 
                  (formData.campaignType ? `Campaign Type (${formData.campaignType})` : "")
                }
                readOnly={true}
              />
            ) : (
              /* Edit Mode: Select */
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

          {/* TAX ID - VIEW/EDIT MODE */}
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

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* BUSINESS NAME - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Business Name *"
                name="businessName"
                placeholder={isEditMode ? "Enter business name" : "No business name"}
                value={formData.businessName}
                onChange={isEditMode ? (value) => handleFieldChange("businessName", value) : undefined}
                readOnly={!isEditMode}
                required={isEditMode}
              />
            </Box>
            
            {/* DEAL CS - VIEW/EDIT MODE WITH SEARCH BUTTON */}
            <Box flex={1} minWidth="250px">
              {/* Mode Controls - Only show in Edit Mode */}
              {isEditMode && (
                <Flex gap="small" marginBottom="small" wrap="wrap">
                  <Button
                    variant={!useDealCSSearchMode ? "primary" : "secondary"}
                    size="xs"
                    onClick={switchDealCSToBrowseMode}
                    disabled={isDealCSLoading}
                  >
                    📋 Browse
                  </Button>
                  <Button
                    variant={useDealCSSearchMode ? "primary" : "secondary"}
                    size="xs"
                    onClick={switchDealCSToSearchMode}
                    disabled={isDealCSLoading}
                  >
                    🔍 Search
                  </Button>
                  {useDealCSSearchMode && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearDealCSSearch}
                    >
                      ✕ Clear
                    </Button>
                  )}
                </Flex>
              )}

              {/* View Mode: Simple Input Display with proper label */}
              {!isEditMode ? (
                <Input
                  label="Deal CS *"
                  name="dealCS"
                  placeholder="No CS representative selected"
                  value={
                    displayLabels.dealCS || 
                    (formData.dealCS ? `CS Rep (${formData.dealCS})` : "")
                  }
                  readOnly={true}
                />
              ) : (
                /* Edit Mode: Search or Select */
                <>
                  {useDealCSSearchMode ? (
                    <Flex gap="small" direction="row" align="end">
                      <Box flex={1}>
                        <Input
                          label="Search CS Representatives *"
                          name="searchDealCS"
                          placeholder="Enter CS rep name..."
                          value={dealCSSearchTerm}
                          onChange={(value) => setDealCSSearchTerm(value)}
                          disabled={isDealCSLoading || isDealCSSearching}
                        />
                      </Box>
                      <Box>
                        <Button 
                          onClick={performDealCSSearch}
                          disabled={!dealCSSearchTerm.trim() || isDealCSSearching || isDealCSLoading}
                        >
                          {isDealCSSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                        </Button>
                      </Box>
                    </Flex>
                  ) : (
                    <Select
                      label="Deal CS *"
                      name="dealCS"
                      options={dealCS}
                      value={formData.dealCS}
                      onChange={(value) => handleFieldChange("dealCS", value)}
                      required
                      disabled={isDealCSLoading}
                    />
                  )}

                  {/* Search Results */}
                  {useDealCSSearchMode && lastDealCSSearchTerm && dealCS.length > 1 && (
                    <Box marginTop="small">
                      <Select
                        label="Select from search results"
                        name="dealCSSearchResults"
                        options={dealCS}
                        value={formData.dealCS}
                        onChange={(value) => handleFieldChange("dealCS", value)}
                        disabled={isDealCSSearching}
                      />
                    </Box>
                  )}

                  {/* Status Messages */}
                  {getDealCSStatusMessage() && (
                    <Text variant="microcopy" format={{ color: 'medium' }}>
                      {getDealCSStatusMessage()}
                    </Text>
                  )}

                  {/* Error Messages */}
                  {dealCSErrorMessage && (
                    <Box marginTop="extra-small">
                      <Text variant="microcopy" format={{ color: 'error' }}>
                        {dealCSErrorMessage}
                      </Text>
                      <Box marginTop="extra-small">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={loadDefaultDealCS}
                          disabled={isDealCSLoading}
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
      </Box>
    </Tile>
  );
};

export default CampaignDetails;