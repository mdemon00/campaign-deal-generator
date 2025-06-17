// src/app/extensions/components/CampaignDetails.jsx
// Complete Fixed Version - Resolves View Mode ID Display Issues

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
  Alert,
  LoadingSpinner
} from "@hubspot/ui-extensions";

import {
  CAMPAIGN_TYPE_OPTIONS,
  DEAL_CS_OPTIONS,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const CampaignDetails = ({
  formData,
  onChange,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false
}) => {

  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

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

  // Load saved data on component mount (only in edit mode)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadCampaignDetails();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load data for view mode - but quietly
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && !isEditMode) {
      loadCampaignDetailsForViewMode();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load default Deal CS data (only in edit mode)
  useEffect(() => {
    if (runServerless && isEditMode && !hasDealCSLoaded) {
      loadDefaultDealCS();
    }
  }, [runServerless, isEditMode, hasDealCSLoaded]);

  // 🔧 FIXED: Only update display labels in edit mode when arrays are populated
  useEffect(() => {
    if (isEditMode) {
      updateDisplayLabels();
    }
  }, [formData, dealCS, isEditMode]);

  // Track form changes (only in edit mode)
  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const campaignDetailsFields = ['campaignType', 'taxId', 'businessName', 'dealCS'];
      const hasChanges = campaignDetailsFields.some(key =>
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

    // 🔧 FIXED: Don't overwrite existing labels in view mode
    // Only update labels when in edit mode and arrays are populated

    // Campaign Type
    if (!displayLabels.campaignType || isEditMode) {
      const selectedCampaignType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === formData.campaignType);
      if (selectedCampaignType) {
        newLabels.campaignType = selectedCampaignType.label;
      }
    }

    // Deal CS
    if (!displayLabels.dealCS || isEditMode) {
      const selectedDealCS = dealCS.find(cs => cs.value === formData.dealCS);
      if (selectedDealCS) {
        newLabels.dealCS = selectedDealCS.label;
      }
    }

    setDisplayLabels(newLabels);
  };

  // === 🔧 FIXED: Enhanced View Mode Loading ===
  const loadCampaignDetailsForViewMode = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    try {
      const response = await runServerless({
        name: "loadCampaignDetails",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data (quietly, no state changes for save tracking)
        const campaignDetailsFields = ['campaignType', 'taxId', 'businessName', 'dealCS'];
        campaignDetailsFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // 🔧 FIXED: Set display labels directly from association data with proper fallbacks
        const newDisplayLabels = {};
        
        // Campaign Type - find from constants
        const selectedCampaignType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === data.formData.campaignType);
        newDisplayLabels.campaignType = selectedCampaignType?.label || data.formData.campaignType || "";

        // Deal CS - Handle association data OR fallback gracefully
        if (data.associations?.dealCS) {
          // Best case: we have association data with the label
          newDisplayLabels.dealCS = data.associations.dealCS.label;
        } else if (data.formData.dealCS) {
          // Fallback: Try to fetch Deal CS info for this specific ID
          try {
            const dealCSLookupResponse = await runServerless({
              name: "searchDealOwners",
              parameters: {
                searchTerm: "",
                loadAll: false,
                limit: 100 // Load enough to find the specific ID
              }
            });
            
            if (dealCSLookupResponse?.status === "SUCCESS" && dealCSLookupResponse?.response?.data) {
              const dealCSOptions = dealCSLookupResponse.response.data.options || [];
              const foundDealCS = dealCSOptions.find(cs => cs.value === data.formData.dealCS);
              
              if (foundDealCS) {
                newDisplayLabels.dealCS = foundDealCS.label;
              } else {
                // Still not found, use user-friendly fallback
                newDisplayLabels.dealCS = `CS Representative (${data.formData.dealCS})`;
              }
            } else {
              // API call failed, use user-friendly fallback
              newDisplayLabels.dealCS = `CS Representative (${data.formData.dealCS})`;
            }
          } catch (lookupError) {
            console.warn("Could not lookup Deal CS details for view mode:", lookupError);
            // Final fallback: user-friendly display
            newDisplayLabels.dealCS = `CS Representative (${data.formData.dealCS})`;
          }
        } else {
          newDisplayLabels.dealCS = "";
        }
        
        // 🔧 CRITICAL: Set display labels directly, bypassing updateDisplayLabels
        setDisplayLabels(newDisplayLabels);

        console.log("✅ Campaign details loaded for view mode with enhanced display labels:", newDisplayLabels);
      }
    } catch (error) {
      console.warn("Could not load campaign details for view mode:", error);
    }
  };

  // === SAVE/LOAD FUNCTIONS ===
  const loadCampaignDetails = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "loadCampaignDetails",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data
        const campaignDetailsFields = ['campaignType', 'taxId', 'businessName', 'dealCS'];
        campaignDetailsFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Update display labels from association data and form data
        const newDisplayLabels = { ...displayLabels };
        
        // Campaign Type - find from constants
        const selectedCampaignType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === data.formData.campaignType);
        newDisplayLabels.campaignType = selectedCampaignType?.label || data.formData.campaignType || "";

        if (data.associations?.dealCS) {
          newDisplayLabels.dealCS = data.associations.dealCS.label;
          setDealCSSearchTerm(data.associations.dealCS.label);
        }
        
        setDisplayLabels(newDisplayLabels);

        // Store initial form data for change tracking
        setInitialFormData(data.formData);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.campaignType || data.formData.taxId || data.formData.businessName || data.formData.dealCS)
          });
        }

        console.log("✅ Campaign details loaded successfully with display labels:", newDisplayLabels);
      } else {
        throw new Error(response?.response?.message || "Failed to load campaign details");
      }
    } catch (error) {
      console.error("❌ Error loading campaign details:", error);
      setSaveError(`Failed to load: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveCampaignDetails = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "saveCampaignDetails",
        parameters: {
          campaignDealId: context.crm.objectId,
          campaignType: formData.campaignType,
          taxId: formData.taxId,
          businessName: formData.businessName,
          dealCS: formData.dealCS,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update tracking state
        setInitialFormData({ 
          campaignType: formData.campaignType,
          taxId: formData.taxId,
          businessName: formData.businessName,
          dealCS: formData.dealCS
        });
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

        console.log("✅ Campaign details saved successfully");
      } else {
        throw new Error(response?.response?.message || "Failed to save campaign details");
      }
    } catch (error) {
      console.error("❌ Error saving campaign details:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
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
           !formData.campaignType ||
           !formData.taxId ||
           !formData.businessName ||
           !formData.dealCS;
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

  const statusDisplay = getSaveStatusDisplay();

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Campaign Details</Heading>

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
              {!isEditMode && (
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
              )}

              {/* Edit Mode: Search or Select */}
              {isEditMode && useDealCSSearchMode ? (
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
              ) : isEditMode ? (
                <Select
                  label="Deal CS *"
                  name="dealCS"
                  options={dealCS}
                  value={formData.dealCS}
                  onChange={(value) => handleFieldChange("dealCS", value)}
                  required
                  disabled={isDealCSLoading}
                />
              ) : null}

              {/* Search Results - Only in Edit Mode */}
              {isEditMode && useDealCSSearchMode && lastDealCSSearchTerm && dealCS.length > 1 && (
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

              {/* Status Messages - Only in Edit Mode */}
              {getDealCSStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getDealCSStatusMessage()}
                </Text>
              )}

              {/* Error Messages - Only in Edit Mode */}
              {isEditMode && dealCSErrorMessage && (
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
            </Box>
          </Flex>
        </Box>

        {/* Save Button - Only show in Edit Mode */}
        {shouldShowSaveButton() && (
          <Box marginTop="medium">
            <Flex justify="end">
              <Button
                variant="primary"
                onClick={saveCampaignDetails}
                disabled={isSaveDisabled()}
              >
                {saveState === COMPONENT_SAVE_STATES.SAVING ? "Saving..." : "💾 Save Campaign Details"}
              </Button>
            </Flex>
          </Box>
        )}
      </Box>
    </Tile>
  );
};

export default CampaignDetails;