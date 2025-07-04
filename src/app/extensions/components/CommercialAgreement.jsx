// src/app/extensions/components/CommercialAgreement.jsx
// New Component - Moved Commercial Agreement logic from BasicInformation

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
  COMMERCIAL_AGREEMENTS,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const CommercialAgreement = forwardRef(({
  formData,
  onChange,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false,
  lineItemsRef // New prop to communicate with LineItems component
}, ref) => {

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
  const [agreementErrorMessage, setAgreementErrorMessage] = useState("");
  const [agreementHasMore, setAgreementHasMore] = useState(false);
  const [lastAgreementSearchTerm, setLastAgreementSearchTerm] = useState("");
  const [companyStatus, setCompanyStatus] = useState("");

  // === VIEW MODE DISPLAY LABELS ===
  const [displayLabels, setDisplayLabels] = useState({
    commercialAgreement: ""
  });

  // === COMPONENT INITIALIZATION ===

  // Load saved data on component mount (only in edit mode)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadCommercialAgreement();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load data for view mode - but quietly
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && !isEditMode) {
      loadCommercialAgreementForViewMode();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Skip loading default agreements - we'll only load when user searches

  // Update display labels in edit mode when arrays are populated
  useEffect(() => {
    if (isEditMode) {
      updateDisplayLabels();
    }
  }, [formData, agreements, isEditMode]);

  // Track form changes (only in edit mode)
  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const commercialFields = ['commercialAgreement', 'company', 'currency'];
      const hasChanges = commercialFields.some(key =>
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

  // Fetch agreement products when commercial agreement is initially loaded (edit mode only)
  useEffect(() => {
    if (isEditMode && formData.commercialAgreement && formData.commercialAgreement !== "" && 
        saveState === COMPONENT_SAVE_STATES.SAVED && lineItemsRef?.current?.updateAgreementProducts) {
      console.log(`🔄 Initial load: Fetching products for loaded commercial agreement: ${formData.commercialAgreement}`);
      fetchProductsForCommercialAgreement(formData.commercialAgreement);
    }
  }, [isEditMode, formData.commercialAgreement, saveState, lineItemsRef]);

  // === DISPLAY LABEL FUNCTIONS ===
  const updateDisplayLabels = () => {
    const newLabels = { ...displayLabels };

    // Commercial Agreement
    if (!displayLabels.commercialAgreement || isEditMode) {
      const selectedAgreement = agreements.find(a => a.value === formData.commercialAgreement);
      if (selectedAgreement) {
        newLabels.commercialAgreement = selectedAgreement.label;
      }
    }

    setDisplayLabels(newLabels);
  };

  // === VIEW MODE LOADING ===
  const loadCommercialAgreementForViewMode = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    try {
      const response = await runServerless({
        name: "loadBasicInformation", // Reuse existing function
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data (quietly)
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        commercialFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Set display labels from association data with proper fallbacks
        const newDisplayLabels = {};
        
        // Commercial Agreement
        if (data.associations?.commercialAgreement) {
          newDisplayLabels.commercialAgreement = data.associations.commercialAgreement.label;
        } else if (data.formData.commercialAgreement) {
          try {
            const agreementResponse = await runServerless({
              name: "searchCommercialAgreements",
              parameters: {
                selectedAgreementId: data.formData.commercialAgreement,
                limit: 1
              }
            });
            
            if (agreementResponse?.status === "SUCCESS" && agreementResponse?.response?.data) {
              const foundAgreement = agreementResponse.response.data.options?.find(
                opt => opt.value === data.formData.commercialAgreement
              );
              if (foundAgreement) {
                newDisplayLabels.commercialAgreement = foundAgreement.label;
              } else {
                newDisplayLabels.commercialAgreement = `Agreement (${data.formData.commercialAgreement})`;
              }
            } else {
              newDisplayLabels.commercialAgreement = `Agreement (${data.formData.commercialAgreement})`;
            }
          } catch (error) {
            console.warn("Could not fetch agreement label:", error);
            newDisplayLabels.commercialAgreement = `Agreement (${data.formData.commercialAgreement})`;
          }
        } else {
          newDisplayLabels.commercialAgreement = "";
        }
        
        // Set display labels directly
        setDisplayLabels(newDisplayLabels);

        // console.log($2
      }
    } catch (error) {
      console.warn("Could not load commercial agreement for view mode:", error);
    }
  };

  // === SAVE/LOAD FUNCTIONS ===
  const loadCommercialAgreement = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "loadBasicInformation", // Reuse existing function
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        commercialFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Update display labels from association data
        const newDisplayLabels = { ...displayLabels };
        
        if (data.associations?.commercialAgreement) {
          newDisplayLabels.commercialAgreement = data.associations.commercialAgreement.label;
          setAgreementSearchTerm(data.associations.commercialAgreement.label);
        }
        
        setDisplayLabels(newDisplayLabels);

        // Store initial form data for change tracking
        const commercialFormData = {};
        commercialFields.forEach(key => {
          commercialFormData[key] = data.formData[key];
        });
        setInitialFormData(commercialFormData);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.commercialAgreement)
          });
        }

        // console.log($2
      } else {
        throw new Error(response?.response?.message || "Failed to load data");
      }
    } catch (error) {
      console.error("❌ Error loading commercial agreement:", error);
      setSaveError(`Failed to load: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveCommercialAgreement = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "saveBasicInformation", // Reuse existing function - will need to be updated
        parameters: {
          campaignDealId: context.crm.objectId,
          commercialAgreement: formData.commercialAgreement,
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
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        const commercialFormData = {};
        commercialFields.forEach(key => {
          commercialFormData[key] = formData[key];
        });
        setInitialFormData(commercialFormData);
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

        // console.log($2
      } else {
        throw new Error(response?.response?.message || "Failed to save data");
      }
    } catch (error) {
      console.error("❌ Error saving commercial agreement:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  // === PRODUCTS FETCH FUNCTION ===
  const fetchProductsForCommercialAgreement = async (dealId) => {
    if (!runServerless || !dealId) return;

    try {
      console.log(`🔍 Fetching products for Commercial Agreement ID: ${dealId}`);
      
      const response = await runServerless({
        name: "fetchProductsForDeal",
        parameters: {
          dealId: dealId
        }
      });

      if (response?.status === "SUCCESS") {
        const products = response.response?.response || [];
        console.log(`✅ Found ${products.length} products for Deal ID ${dealId}`);
        
        // Update LineItems component with agreement products
        if (lineItemsRef?.current?.updateAgreementProducts) {
          lineItemsRef.current.updateAgreementProducts(products);
          console.log(`🔄 Updated LineItems with ${products.length} agreement products`);
        }
      } else {
        console.log(`❌ Failed to fetch products for Deal ID ${dealId}:`, response);
      }
    } catch (error) {
      console.error(`❌ Error fetching products for Deal ID ${dealId}:`, error);
    }
  };

  // === COMMERCIAL AGREEMENTS SEARCH FUNCTIONS ===
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
        setLastAgreementSearchTerm(searchTerm);
        
        // console.log($2
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

  // Removed loadDefaultAgreements - commercial agreements are now loaded only through search

  // === EVENT HANDLERS ===
  const handleCommercialAgreementChange = (value) => {
    if (!isEditMode) return;

    const selectedAgreement = agreements.find(agreement => agreement.value === value);

    onChange('commercialAgreement', value);

    if (selectedAgreement && selectedAgreement.value !== "") {
      setAgreementSearchTerm(selectedAgreement.label);

      // Clear existing products first
      if (lineItemsRef?.current?.updateAgreementProducts) {
        lineItemsRef.current.updateAgreementProducts([]);
      }

      // Fetch products for the selected commercial agreement
      fetchProductsForCommercialAgreement(value);

      if (selectedAgreement.hasCompany === false) {
        onChange('company', 'Not found');
        onChange('currency', 'Not found');
        setCompanyStatus("");
      } else if (selectedAgreement.company && selectedAgreement.company !== 'No company found') {
        onChange('company', selectedAgreement.company);
        onChange('currency', selectedAgreement.currency || 'Not found');
        setCompanyStatus("");
      } else {
        onChange('company', 'Not found');
        onChange('currency', 'Not found');
        setCompanyStatus("");
      }
    } else {
      // Clear agreement products when no agreement is selected
      if (lineItemsRef?.current?.updateAgreementProducts) {
        lineItemsRef.current.updateAgreementProducts([]);
      }
      onChange('company', '');
      onChange('currency', '');
      setCompanyStatus("");
    }
  };

  // === CLEAR SEARCH FUNCTIONS ===
  const clearAgreementSearch = () => {
    if (!isEditMode) return;
    setAgreementSearchTerm("");
    setAgreementErrorMessage("");
    setLastAgreementSearchTerm("");
    setAgreements(COMMERCIAL_AGREEMENTS);
  };

  // === MODE CONTROL FUNCTIONS ===
  // Removed browse/search mode switching for commercial agreements

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
           !formData.commercialAgreement;
  };

  // === STATUS MESSAGES ===
  const getAgreementStatusMessage = () => {
    if (!isEditMode) return "";
    if (isAgreementSearching) return "Searching agreements...";
    if (isAgreementLoading) return "Loading agreements...";
    if (lastAgreementSearchTerm) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} results for "${lastAgreementSearchTerm}"`;
    }
    return "";
  };

  const statusDisplay = getSaveStatusDisplay();

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Validate required fields
      if (!formData.commercialAgreement) {
        return "Please select a Commercial Agreement.";
      }
      await saveCommercialAgreement();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Commercial Agreement.";
      return null;
    }
  }));

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Commercial Agreement</Heading>

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
          {/* COMMERCIAL AGREEMENTS - VIEW/EDIT MODE */}
          <Box flex={1} minWidth="250px">
            {/* View Mode: Simple Input Display */}
            {!isEditMode && (
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
            )}

            {/* Edit Mode: Simple Search Interface */}
            {isEditMode && (
              <>
                <Flex gap="small" direction="row" align="end">
                  <Box flex={1}>
                    <Input
                      label="Search Commercial Agreements *"
                      name="searchAgreements"
                      placeholder="Enter agreement name or ID..."
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
                      {isAgreementSearching ? <LoadingSpinner size="xs" /> : "🔍 Search"}
                    </Button>
                  </Box>
                  {lastAgreementSearchTerm && (
                    <Box>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={clearAgreementSearch}
                      >
                        ✕ Clear
                      </Button>
                    </Box>
                  )}
                </Flex>

                {/* Search Results */}
                {lastAgreementSearchTerm && agreements.length > 1 && (
                  <Box marginTop="small">
                    <Select
                      label="Select from search results"
                      name="searchResults"
                      options={agreements}
                      value={formData.commercialAgreement}
                      onChange={(value) => handleCommercialAgreementChange(value)}
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
                        onClick={() => {
                          setAgreementErrorMessage("");
                          if (lastAgreementSearchTerm) {
                            performAgreementSearch();
                          }
                        }}
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
                placeholder={isEditMode ? "Not found" : "No company information"}
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

            {/* CURRENCY - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Currency"
                name="currency"
                value={formData.currency}
                placeholder={
                  !isEditMode ? "No currency information" :
                  formData.company === 'No company found' ? 'No currency available' : 
                  formData.currency ? 'Currency from agreement' : 'Not found'
                }
                readOnly={true}
              />
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
});

export default CommercialAgreement;