// src/app/extensions/CampaignDealGenerator.jsx
// Phase 1: Removed progressive saving infrastructure

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

// Import components
import TestConnection from './components/TestConnection.jsx';
import BasicInformation from './components/BasicInformation.jsx';
import CampaignDetails from './components/CampaignDetails.jsx';
import LineItems from './components/LineItems.jsx';

// Import utilities
import {
  INITIAL_FORM_STATE
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
    handleAlert({
      message: "Form cleared successfully",
      variant: "success"
    });
  };

  // === UI STATE CALCULATIONS ===
  const hasFormData = () => {
    return !!(
      formData.campaignName ||
      formData.commercialAgreement ||
      formData.advertiser ||
      formData.dealOwner ||
      formData.campaignType ||
      formData.taxId ||
      formData.businessName ||
      formData.dealCS ||
      lineItems.length > 0
    );
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
            {/* Data Status */}
            {hasFormData() && (
              <Text variant="microcopy" format={{ color: 'success' }}>
                📊 Campaign data loaded
              </Text>
            )}

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
              isEditMode={isEditMode}
            />
          </Box>

          {/* CAMPAIGN DETAILS */}
          <Box>
            <CampaignDetails
              formData={formData}
              onChange={handleFormChange}
              runServerless={runServerless}
              context={context}
              isEditMode={isEditMode}
            />
          </Box>

          {/* LINE ITEMS SECTION */}
          <Box>
            <LineItems
              lineItems={lineItems}
              onLineItemsChange={handleLineItemsChange}
              onAlert={handleAlert}
              runServerless={runServerless}
              context={context}
              isEditMode={isEditMode}
              currency={formData.currency || "MXN"}
            />
          </Box>

          {/* GLOBAL ACTIONS */}
          <Box>
            <Divider />
            <Flex gap="medium" justify="space-between" align="center">
              <Box>
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  Campaign Deal Generator - Simplified Workflow
                </Text>
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