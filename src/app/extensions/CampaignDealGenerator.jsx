// src/app/extensions/CampaignDealGenerator.jsx
// FIXED: Auto-populate advertiser details during data loading in parent component

import React, { useState, useEffect, useRef } from "react";
import {
  Divider,
  Button,
  Text,
  Flex,
  hubspot,
  Heading,
  Box,
  Alert,
  LoadingSpinner
} from "@hubspot/ui-extensions";

// Import components
import TestConnection from './components/TestConnection.jsx';
import BasicInformation from './components/BasicInformation.jsx';
import CommercialAgreement from './components/CommercialAgreement.jsx';
import LineItems from './components/LineItems.jsx';

// Import utilities
import {
  INITIAL_FORM_STATE,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS,
  SAVE_STATUS_MESSAGES
} from './utils/constants.js';

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <CampaignDealExtension
    context={context}
    runServerless={runServerlessFunction}
    sendAlert={actions.addAlert}
  />
));

const CampaignDealExtension = ({ context, runServerless, sendAlert }) => {
  // === LOADING AND ALERT STATE ===
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // === VIEW/EDIT MODE STATE ===
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get current object information
  const objectId = context.crm.objectId;
  const objectType = context.crm.objectType;
  const userName = `${context.user.firstName} ${context.user.lastName}`;

  // === FORM STATE ===
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [lineItems, setLineItems] = useState([]);

  // === SAVE STATUS TRACKING ===
  const [basicInfoSaveStatus, setBasicInfoSaveStatus] = useState({
    status: 'not_saved',
    lastSaved: null,
    hasData: false
  });

  const [commercialAgreementSaveStatus, setCommercialAgreementSaveStatus] = useState({
    status: 'not_saved',
    lastSaved: null,
    hasData: false
  });


  const [lineItemsSaveStatus, setLineItemsSaveStatus] = useState({
    status: 'not_saved',
    lastSaved: null,
    hasData: false
  });

  // === CHILD COMPONENT REFS FOR SAVE ===
  const basicInfoRef = useRef();
  const commercialAgreementRef = useRef();
  const lineItemsRef = useRef();

  // === ERROR STATE FOR UNIFIED SAVE ===
  const [saveErrors, setSaveErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // === INITIAL DATA LOADING ===
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isInitialLoad) {
      loadAllDataForViewMode();
      setIsInitialLoad(false);
    }
  }, [context?.crm?.objectId, runServerless, isInitialLoad]);

  // === TRACK UNSAVED CHANGES ===
  useEffect(() => {
    const hasChanges = (
      (basicInfoSaveStatus.hasData && basicInfoSaveStatus.status !== 'Saved') ||
      (commercialAgreementSaveStatus.hasData && commercialAgreementSaveStatus.status !== 'Saved') ||
      (lineItemsSaveStatus.hasData && lineItemsSaveStatus.status !== 'Saved')
    );
    setHasUnsavedChanges(hasChanges);
  }, [basicInfoSaveStatus, commercialAgreementSaveStatus, lineItemsSaveStatus]);

  // === DATA LOADING FOR VIEW MODE ===
  const loadAllDataForViewMode = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBasicInfoQuietly(),
        loadCommercialAgreementQuietly(),
        loadLineItemsQuietly()
      ]);
      setHasLoadedData(true);
      console.log('🔍 [PARENT] All data loaded for view mode');
    } catch (error) {
      console.error("Error loading data for view mode:", error);
      setHasLoadedData(true);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FIXED: Enhanced loadBasicInfoQuietly with advertiser auto-population
  const loadBasicInfoQuietly = async () => {
    try {
      const response = await runServerless({
        name: "loadBasicInformation",
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        console.log('🔍 [PARENT] Original basic info data:', data.formData);

        // 🔧 FIXED: Auto-populate advertiser details if missing
        if (data.formData.advertiser && (!data.formData.advertiserCountry || !data.formData.advertiserCompany)) {
          try {
            console.log(`🔍 [PARENT] Fetching advertiser details for auto-population: ${data.formData.advertiser}`);
            
            const advertiserResponse = await runServerless({
              name: "searchAdvertisers",
              parameters: {
                selectedAdvertiserId: data.formData.advertiser,
                limit: 1
              }
            });

            console.log('🔍 [PARENT] Advertiser response:', advertiserResponse);

            if (advertiserResponse?.status === "SUCCESS" && advertiserResponse?.response?.data) {
              const foundAdvertiser = advertiserResponse.response.data.options?.find(
                opt => opt.value === data.formData.advertiser
              );

              console.log('🔍 [PARENT] Found advertiser for auto-population:', foundAdvertiser);

              if (foundAdvertiser) {
                // Auto-populate missing fields
                if (!data.formData.advertiserCountry && foundAdvertiser.country) {
                  console.log(`🔧 [PARENT] Auto-populating country: ${foundAdvertiser.country}`);
                  data.formData.advertiserCountry = foundAdvertiser.country;
                }
                if (!data.formData.advertiserCompany && foundAdvertiser.companyName) {
                  console.log(`🔧 [PARENT] Auto-populating company: ${foundAdvertiser.companyName}`);
                  data.formData.advertiserCompany = foundAdvertiser.companyName;
                }
              }
            }
          } catch (error) {
            console.warn('Could not fetch advertiser details for auto-population:', error);
          }
        }

        // Update form data with auto-populated data
        const basicFields = ['campaignName', 'taxId', 'advertiser', 'advertiserCountry', 'advertiserCompany', 'dealOwner', 'assignedCustomerService', 'contact', 'campaignType', 'linkToGoogleDrive'];
        basicFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            setFormData(prev => ({ ...prev, [key]: data.formData[key] }));
          }
        });

        setBasicInfoSaveStatus({
          status: data.saveStatus || 'not_saved',
          lastSaved: data.metadata?.lastSaved,
          hasData: !!(data.formData.campaignName || data.formData.taxId || data.formData.advertiser)
        });

        console.log('🔍 [PARENT] Basic info loaded with auto-populated data:', data.formData);
      }
    } catch (error) {
      console.warn("Could not load basic information for view mode:", error);
    }
  };

  const loadCommercialAgreementQuietly = async () => {
    try {
      const response = await runServerless({
        name: "loadBasicInformation", // Reuse existing function
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update only commercial agreement fields
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        commercialFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            setFormData(prev => ({ ...prev, [key]: data.formData[key] }));
          }
        });

        setCommercialAgreementSaveStatus({
          status: data.saveStatus || 'not_saved',
          lastSaved: data.metadata?.lastSaved,
          hasData: !!(data.formData.commercialAgreement)
        });

        console.log('🔍 [PARENT] Commercial agreement loaded:', data.formData);
      }
    } catch (error) {
      console.warn("Could not load commercial agreement for view mode:", error);
    }
  };


  const loadLineItemsQuietly = async () => {
    try {
      const response = await runServerless({
        name: "loadLineItems",
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        setLineItems(data.lineItems || []);

        setLineItemsSaveStatus({
          status: data.saveStatus || 'not_saved',
          lastSaved: data.metadata?.lastSaved,
          hasData: data.lineItems && data.lineItems.length > 0
        });

        console.log('🔍 [PARENT] Line items loaded:', data.lineItems?.length || 0);
      }
    } catch (error) {
      console.warn("Could not load line items for view mode:", error);
    }
  };

  // === MODE TOGGLE HANDLERS ===
  const handleSwitchToEditMode = () => {
    setIsEditMode(true);
    sendAlert({
      message: "Switched to Edit Mode - You can now modify fields and select products",
      variant: "info"
    });
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      // Show confirmation for unsaved changes
      const confirmed = confirm("You have unsaved changes. Are you sure you want to cancel and lose these changes?");
      if (!confirmed) {
        return;
      }
    }

    setIsEditMode(false);
    sendAlert({
      message: "Returned to View Mode - Changes cancelled",
      variant: "info"
    });
  };

  // === FORM HANDLERS ===
  const handleFormChange = (field, value) => {
    if (isEditMode) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLineItemsChange = (newLineItems) => {
    if (isEditMode) {
      setLineItems(newLineItems);
    }
  };

  const handleAlert = (alertData) => {
    setAlertMessage(alertData);
    setTimeout(() => setAlertMessage(""), 4000);
  };

  // === SAVE STATUS HANDLERS ===
  const handleBasicInfoSaveStatusChange = (statusData) => {
    setBasicInfoSaveStatus(statusData);

    if (statusData.status === 'Saved') {
      sendAlert({
        message: "Basic information saved successfully",
        variant: "success"
      });
    }
  };

  const handleCommercialAgreementSaveStatusChange = (statusData) => {
    setCommercialAgreementSaveStatus(statusData);

    if (statusData.status === 'Saved') {
      sendAlert({
        message: "Commercial agreement saved successfully",
        variant: "success"
      });
    }
  };


  const handleLineItemsSaveStatusChange = (statusData) => {
    setLineItemsSaveStatus(statusData);

    if (statusData.status === 'Saved') {
      sendAlert({
        message: "Line items saved successfully",
        variant: "success"
      });
    }
  };

  // === UNIFIED SAVE HANDLER ===
  const handleUnifiedSave = async () => {
    setSaveErrors([]);
    setIsSaving(true);
    let errors = [];
    
    if (basicInfoRef.current && basicInfoRef.current.save) {
      const err = await basicInfoRef.current.save();
      if (err) errors.push(...(Array.isArray(err) ? err : [err]));
    }
    
    if (commercialAgreementRef.current && commercialAgreementRef.current.save) {
      const err = await commercialAgreementRef.current.save();
      if (err) errors.push(...(Array.isArray(err) ? err : [err]));
    }
    
    
    if (lineItemsRef.current && lineItemsRef.current.save) {
      const err = await lineItemsRef.current.save();
      if (err) errors.push(...(Array.isArray(err) ? err : [err]));
    }
    
    setSaveErrors(errors);
    setIsSaving(false);
    
    // Optionally, switch out of edit mode if no errors
    if (errors.length === 0) {
      setIsEditMode(false);
      sendAlert({ message: "All sections saved successfully", variant: "success" });
    }
  };

  // === UTILITY FUNCTIONS ===
  const handleClearForm = () => {
    if (!isEditMode) {
      sendAlert({
        message: "Switch to Edit Mode to clear the form",
        variant: "warning"
      });
      return;
    }

    setFormData(INITIAL_FORM_STATE);
    setLineItems([]);
    setBasicInfoSaveStatus({
      status: 'not_saved',
      lastSaved: null,
      hasData: false
    });
    setCommercialAgreementSaveStatus({
      status: 'not_saved',
      lastSaved: null,
      hasData: false
    });
    setLineItemsSaveStatus({
      status: 'not_saved',
      lastSaved: null,
      hasData: false
    });
    handleAlert({
      message: "Form cleared successfully",
      variant: "success"
    });
  };

  // === UI STATE CALCULATIONS ===
  const getOverallProgress = () => {
    let progress = 0;
    let total = 3;

    if (basicInfoSaveStatus.status === 'Saved') {
      progress += 1;
    } else if (basicInfoSaveStatus.hasData) {
      progress += 0.5;
    }

    if (commercialAgreementSaveStatus.status === 'Saved') {
      progress += 1;
    } else if (commercialAgreementSaveStatus.hasData) {
      progress += 0.5;
    }

    if (lineItemsSaveStatus.status === 'Saved') {
      progress += 1;
    } else if (lineItemsSaveStatus.hasData) {
      progress += 0.5;
    }

    return { progress, total, percentage: Math.round((progress / total) * 100) };
  };

  const progressInfo = getOverallProgress();

  const getProgressColor = () => {
    if (progressInfo.percentage >= 100) return "success";
    if (progressInfo.percentage >= 50) return "warning";
    return "medium";
  };

  const getModeDisplayInfo = () => {
    if (isEditMode) {
      return {
        text: "Edit Mode - You can select products and modify all fields",
        color: "warning"
      };
    } else {
      return {
        text: "View Mode - Read-only display",
        color: "medium"
      };
    }
  };

  const modeInfo = getModeDisplayInfo();

  return (
    <Flex direction="column" gap="large">
      {/* SHOW CONTENT AFTER LOADING OR IF NO DATA */}
      {(hasLoadedData || !isInitialLoad) && (
        <>
          {/* BASIC INFORMATION */}
          <Box>
            <BasicInformation
              ref={basicInfoRef}
              formData={formData}
              onChange={handleFormChange}
              runServerless={runServerless}
              context={context}
              onSaveStatusChange={handleBasicInfoSaveStatusChange}
              isEditMode={isEditMode}
            />
          </Box>

          {/* Basic Info Status Alert */}
          {isEditMode && basicInfoSaveStatus.status !== 'Saved' && basicInfoSaveStatus.hasData && (
            <Box>
              <Alert variant="warning">
                Basic Information has unsaved changes. Please save before proceeding.
              </Alert>
            </Box>
          )}

          {/* COMMERCIAL AGREEMENT */}
          <Box>
            <CommercialAgreement
              ref={commercialAgreementRef}
              formData={formData}
              onChange={handleFormChange}
              runServerless={runServerless}
              context={context}
              onSaveStatusChange={handleCommercialAgreementSaveStatusChange}
              isEditMode={isEditMode}
              lineItemsRef={lineItemsRef}
            />
          </Box>

          {/* Commercial Agreement Status Alert */}
          {isEditMode && commercialAgreementSaveStatus.status !== 'Saved' && commercialAgreementSaveStatus.hasData && (
            <Box>
              <Alert variant="warning">
                Commercial Agreement has unsaved changes. Please save before proceeding.
              </Alert>
            </Box>
          )}


          {/* ENHANCED LINE ITEMS SECTION */}
          <Box>
            <LineItems
              ref={lineItemsRef}
              lineItems={lineItems}
              onLineItemsChange={handleLineItemsChange}
              onAlert={handleAlert}
              runServerless={runServerless}
              context={context}
              onSaveStatusChange={handleLineItemsSaveStatusChange}
              isEditMode={isEditMode}
              currency={formData.currency || "MXN"}
            />
          </Box>

          {/* Line Items Status Alert */}
          {isEditMode && lineItemsSaveStatus.status !== 'Saved' && lineItemsSaveStatus.hasData && (
            <Box>
              <Alert variant="warning">
                Line Items have unsaved changes. Please save to lock in your progress.
              </Alert>
            </Box>
          )}

          {/* MODE TOGGLE BUTTONS - BOTTOM CENTER */}
          <Box>
            <Divider />
            <Flex justify="center" align="center" gap="medium">
              {!isEditMode ? (
                /* VIEW MODE - Edit Button */
                <Button
                  variant="primary"
                  onClick={handleSwitchToEditMode}
                  disabled={loading}
                >
                  Edit
                </Button>
              ) : (
                <>
                  {isSaving ? (
                    <Flex gap="large" justify="center">
                      <LoadingSpinner />
                    </Flex>
                  ) : ("")}
                  <Button
                    variant="primary"
                    onClick={handleUnifiedSave}
                    disabled={loading || isSaving}
                  >
                    {isSaving ? "Saving.." : "Save"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </Flex>
          </Box>

          {/* Show all errors under Save/Cancel */}
          {isEditMode && saveErrors.length > 0 && (
            <Box>
              {saveErrors.map((err, idx) => (
                <Alert key={idx} variant="error">{err}</Alert>
              ))}
            </Box>
          )}

          {/* GLOBAL ACTIONS - EDIT MODE ONLY */}
          {isEditMode && (
            <Box>
              <Flex gap="medium" justify="space-between" align="center">
                <Box>
                  {(basicInfoSaveStatus.lastSaved || commercialAgreementSaveStatus.lastSaved || lineItemsSaveStatus.lastSaved) && (
                    <Text variant="microcopy" format={{ color: 'medium' }}>
                      Last saved:
                      {basicInfoSaveStatus.lastSaved && ` Basic Info (${basicInfoSaveStatus.lastSaved})`}
                      {(basicInfoSaveStatus.lastSaved && (commercialAgreementSaveStatus.lastSaved || lineItemsSaveStatus.lastSaved)) && `, `}
                      {commercialAgreementSaveStatus.lastSaved && ` Commercial Agreement (${commercialAgreementSaveStatus.lastSaved})`}
                      {(commercialAgreementSaveStatus.lastSaved && lineItemsSaveStatus.lastSaved) && `, `}
                      {lineItemsSaveStatus.lastSaved && ` Line Items (${lineItemsSaveStatus.lastSaved})`}
                    </Text>
                  )}
                </Box>
              </Flex>
            </Box>
          )}
        </>
      )}

      {/* Alert Messages */}
      {alertMessage && (
        <Alert variant={alertMessage.variant}>
          {alertMessage.message}
        </Alert>
      )}
    </Flex>
  );
};

export default CampaignDealExtension;