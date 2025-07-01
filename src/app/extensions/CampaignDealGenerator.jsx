// src/app/extensions/CampaignDealGenerator.jsx
// Phase 1: Removed Campaign Summary component and section

import React, { useState, useEffect } from "react";
import {
  Divider,
  Button,
  Text,
  Flex,
  hubspot,
  Heading,
  Box,
  Alert
} from "@hubspot/ui-extensions";

// Import components (CampaignSummary removed)
import TestConnection from './components/TestConnection.jsx';
import BasicInformation from './components/BasicInformation.jsx';
import CampaignDetails from './components/CampaignDetails.jsx';
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

  const [campaignDetailsSaveStatus, setCampaignDetailsSaveStatus] = useState({
    status: 'not_saved',
    lastSaved: null,
    hasData: false
  });

  const [lineItemsSaveStatus, setLineItemsSaveStatus] = useState({
    status: 'not_saved',
    lastSaved: null,
    hasData: false
  });

  // === INITIAL DATA LOADING ===
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isInitialLoad) {
      loadAllDataForViewMode();
      setIsInitialLoad(false);
    }
  }, [context?.crm?.objectId, runServerless, isInitialLoad]);

  // === DATA LOADING FOR VIEW MODE ===
  const loadAllDataForViewMode = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBasicInfoQuietly(),
        loadCampaignDetailsQuietly(),
        loadLineItemsQuietly()
      ]);
      setHasLoadedData(true);
      console.log("✅ All data loaded for view mode");
    } catch (error) {
      console.error("Error loading data for view mode:", error);
      setHasLoadedData(true);
    } finally {
      setLoading(false);
    }
  };

  const loadBasicInfoQuietly = async () => {
    try {
      const response = await runServerless({
        name: "loadBasicInformation",
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        Object.keys(data.formData).forEach(key => {
          if (data.formData[key] !== formData[key]) {
            setFormData(prev => ({ ...prev, [key]: data.formData[key] }));
          }
        });

        setBasicInfoSaveStatus({
          status: data.saveStatus || 'not_saved',
          lastSaved: data.metadata?.lastSaved,
          hasData: !!(data.formData.campaignName || data.formData.commercialAgreement)
        });

        console.log("✅ Basic information loaded quietly for view mode");
      }
    } catch (error) {
      console.warn("Could not load basic information for view mode:", error);
    }
  };

  const loadCampaignDetailsQuietly = async () => {
    try {
      const response = await runServerless({
        name: "loadCampaignDetails",
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        const campaignDetailsFields = ['campaignType', 'taxId', 'businessName', 'dealCS'];
        campaignDetailsFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            setFormData(prev => ({ ...prev, [key]: data.formData[key] }));
          }
        });

        setCampaignDetailsSaveStatus({
          status: data.saveStatus || 'not_saved',
          lastSaved: data.metadata?.lastSaved,
          hasData: !!(data.formData.campaignType || data.formData.taxId || data.formData.businessName || data.formData.dealCS)
        });

        console.log("✅ Campaign details loaded quietly for view mode");
      }
    } catch (error) {
      console.warn("Could not load campaign details for view mode:", error);
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

        console.log("✅ Line items loaded quietly for view mode");
      }
    } catch (error) {
      console.warn("Could not load line items for view mode:", error);
    }
  };

  // === MODE TOGGLE HANDLERS ===
  const handleSwitchToEditMode = () => {
    setIsEditMode(true);
    sendAlert({
      message: "✏️ Switched to Edit Mode - You can now modify fields and select products",
      variant: "info"
    });
  };

  const handleSwitchToViewMode = () => {
    setIsEditMode(false);
    sendAlert({
      message: "👁️ Switched to View Mode - Fields are now read-only",
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
        message: "✅ Basic information saved successfully!",
        variant: "success"
      });
    }
  };

  const handleCampaignDetailsSaveStatusChange = (statusData) => {
    setCampaignDetailsSaveStatus(statusData);

    if (statusData.status === 'Saved') {
      sendAlert({
        message: "✅ Campaign details saved successfully!",
        variant: "success"
      });
    }
  };

  const handleLineItemsSaveStatusChange = (statusData) => {
    setLineItemsSaveStatus(statusData);

    if (statusData.status === 'Saved') {
      sendAlert({
        message: "✅ Line items saved successfully!",
        variant: "success"
      });
    }
  };

  // === UTILITY FUNCTIONS ===
  const handleClearForm = () => {
    if (!isEditMode) {
      sendAlert({
        message: "⚠️ Switch to Edit Mode to clear the form",
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
    setCampaignDetailsSaveStatus({
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

    if (campaignDetailsSaveStatus.status === 'Saved') {
      progress += 1;
    } else if (campaignDetailsSaveStatus.hasData) {
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
        icon: "✏️",
        text: "Edit Mode - You can select products and modify all fields",
        color: "warning"
      };
    } else {
      return {
        icon: "👁️",
        text: "View Mode - Read-only display",
        color: "medium"
      };
    }
  };

  const modeInfo = getModeDisplayInfo();

  return (
    <Flex direction="column" gap="large">
      {/* HEADER WITH MODE TOGGLE */}
      <Box>
        <Divider />
        <Flex justify="space-between" align="center">
          <Box>
            <Heading>Campaign Deal Generator</Heading>
            <Text variant="microcopy" format={{ color: modeInfo.color }}>
              {modeInfo.icon} {modeInfo.text}
            </Text>
            {/* Product Catalog Status */}
            {isEditMode && (
              <Text variant="microcopy" format={{ color: 'success' }}>
                📦 Product Catalog Integration Active
              </Text>
            )}
          </Box>

          <Flex align="center" gap="medium">
            {/* Progress Indicator */}
            <Box>
              <Text
                variant="microcopy"
                format={{
                  color: getProgressColor(),
                  fontWeight: "bold"
                }}
              >
                📊 Progress: {progressInfo.progress}/{progressInfo.total} ({progressInfo.percentage}%)
              </Text>
              <Text variant="microcopy" format={{ color: 'medium' }}>
                {basicInfoSaveStatus.status === 'Saved' ? "✅ Basic Info" : "⏳ Basic Info"} |
                {campaignDetailsSaveStatus.status === 'Saved' ? "✅ Details" : "⏳ Details"} |
                {lineItemsSaveStatus.status === 'Saved' ? "✅ Line Items" : "⏳ Line Items"}
              </Text>
            </Box>

            {/* MODE TOGGLE BUTTON */}
            <Button
              variant={isEditMode ? "secondary" : "primary"}
              onClick={isEditMode ? handleSwitchToViewMode : handleSwitchToEditMode}
              disabled={loading}
            >
              {isEditMode ? "👁️ Switch to View" : "✏️ Switch to Edit"}
            </Button>
          </Flex>
        </Flex>
        <Divider />
      </Box>

      {/* Loading State */}
      {loading && isInitialLoad && (
        <Box>
          <Alert variant="info">
            📖 Loading campaign deal data...
          </Alert>
        </Box>
      )}

      {/* MODE INSTRUCTION ALERT */}
      {!isEditMode && hasLoadedData && (
        <Box>
          <Alert variant="info">
            👁️ Currently in View Mode. All fields are read-only. Click "Switch to Edit" to access the product catalog and make changes.
          </Alert>
        </Box>
      )}

      {/* PRODUCT CATALOG INTRODUCTION */}
      {isEditMode && (
        <Box>
          <Alert variant="success">
            📦 Product Catalog Integration: You can now select products with predefined pricing, buying models (CPM, CPC, CPA), and appropriate units. This ensures accurate pricing and eliminates manual entry errors.
          </Alert>
        </Box>
      )}

      {/* SHOW CONTENT AFTER LOADING OR IF NO DATA */}
      {(hasLoadedData || !isInitialLoad) && (
        <>
          {/* BASIC INFORMATION */}
          <Box>
            <BasicInformation
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
                ⚠️ Basic Information has unsaved changes. Please save before proceeding to Campaign Details.
              </Alert>
            </Box>
          )}

          {/* CAMPAIGN DETAILS */}
          <Box>
            <CampaignDetails
              formData={formData}
              onChange={handleFormChange}
              runServerless={runServerless}
              context={context}
              onSaveStatusChange={handleCampaignDetailsSaveStatusChange}
              isEditMode={isEditMode}
            />
          </Box>

          {/* Campaign Details Status Alert */}
          {isEditMode && campaignDetailsSaveStatus.status !== 'Saved' && campaignDetailsSaveStatus.hasData && (
            <Box>
              <Alert variant="warning">
                ⚠️ Campaign Details have unsaved changes. Please save to lock in your progress.
              </Alert>
            </Box>
          )}

          {/* ENHANCED LINE ITEMS SECTION */}
          <Box>
            <LineItems
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
                ⚠️ Line Items have unsaved changes. Please save to lock in your progress.
              </Alert>
            </Box>
          )}

          {/* CAMPAIGN SUMMARY SECTION - REMOVED */}
          {/* This section has been completely removed as requested */}

          {/* GLOBAL ACTIONS */}
          <Box>
            <Divider />
            <Flex gap="medium" justify="space-between" align="center">
              <Box>
                {(basicInfoSaveStatus.lastSaved || campaignDetailsSaveStatus.lastSaved || lineItemsSaveStatus.lastSaved) && (
                  <Text variant="microcopy" format={{ color: 'medium' }}>
                    📅 Last saved:
                    {basicInfoSaveStatus.lastSaved && ` Basic Info (${basicInfoSaveStatus.lastSaved})`}
                    {(basicInfoSaveStatus.lastSaved && (campaignDetailsSaveStatus.lastSaved || lineItemsSaveStatus.lastSaved)) && `, `}
                    {campaignDetailsSaveStatus.lastSaved && ` Details (${campaignDetailsSaveStatus.lastSaved})`}
                    {(campaignDetailsSaveStatus.lastSaved && lineItemsSaveStatus.lastSaved) && `, `}
                    {lineItemsSaveStatus.lastSaved && ` Line Items (${lineItemsSaveStatus.lastSaved})`}
                  </Text>
                )}
              </Box>

              <Flex gap="medium">
                {/* Clear button - only show in edit mode */}
                {isEditMode && (
                  <Button
                    variant="secondary"
                    onClick={handleClearForm}
                    disabled={loading}
                  >
                    🗑️ Clear All
                  </Button>
                )}

                {/* Product Catalog Status */}
                {isEditMode && (
                  <Text variant="microcopy" format={{ color: 'success' }}>
                    📦 Product Catalog: Ready
                  </Text>
                )}
              </Flex>
            </Flex>
          </Box>
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