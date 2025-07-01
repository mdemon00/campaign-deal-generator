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
import { INITIAL_FORM_STATE } from './utils/constants.js';
import { validateCampaignDeal } from './utils/validation.js';

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

  // === UNIFIED FORM STATE ===
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [lineItems, setLineItems] = useState([]);
  
  // === ORIGINAL DATA FOR CANCEL FUNCTIONALITY ===
  const [originalFormData, setOriginalFormData] = useState(INITIAL_FORM_STATE);
  const [originalLineItems, setOriginalLineItems] = useState([]);
  
  // === FORM STATE TRACKING ===
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // === INITIAL DATA LOADING ===
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isInitialLoad) {
      loadAllDataForViewMode();
      setIsInitialLoad(false);
    }
  }, [context?.crm?.objectId, runServerless, isInitialLoad]);

  // === CHANGE TRACKING ===
  useEffect(() => {
    if (isEditMode && hasLoadedData) {
      const formDataChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
      const lineItemsChanged = JSON.stringify(lineItems) !== JSON.stringify(originalLineItems);
      
      const hasChanges = formDataChanged || lineItemsChanged;
      
      if (hasChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasChanges);
      }
    }
  }, [formData, lineItems, originalFormData, originalLineItems, isEditMode, hasLoadedData, hasUnsavedChanges]);

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

        // Update form data
        const updatedFormData = { ...formData };
        Object.keys(data.formData).forEach(key => {
          updatedFormData[key] = data.formData[key];
        });
        setFormData(updatedFormData);

        // Store original data for cancel functionality
        setOriginalFormData(prev => ({ ...prev, ...data.formData }));

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

        // Update form data
        const campaignDetailsFields = ['campaignType', 'taxId', 'businessName', 'dealCS'];
        const updatedFormData = { ...formData };
        campaignDetailsFields.forEach(key => {
          updatedFormData[key] = data.formData[key];
        });
        setFormData(updatedFormData);

        // Store original data for cancel functionality
        const originalCampaignDetails = {};
        campaignDetailsFields.forEach(key => {
          originalCampaignDetails[key] = data.formData[key];
        });
        setOriginalFormData(prev => ({ ...prev, ...originalCampaignDetails }));

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
        // Store original line items for cancel functionality
        setOriginalLineItems(data.lineItems || []);

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
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Switching to view mode will discard them. Are you sure?"
      );
      if (!confirmDiscard) {
        return;
      }
    }
    
    setIsEditMode(false);
    
    // Reset to original data if there were unsaved changes
    if (hasUnsavedChanges) {
      setFormData({ ...originalFormData });
      setLineItems([...originalLineItems]);
      setHasUnsavedChanges(false);
      sendAlert({
        message: "🔄 Unsaved changes discarded - Switched to View Mode",
        variant: "info"
      });
    } else {
      sendAlert({
        message: "👁️ Switched to View Mode - Fields are now read-only",
        variant: "info"
      });
    }
  };

  // === UNIFIED SAVE FUNCTION ===
  const saveAllData = async () => {
    if (!isEditMode || !context?.crm?.objectId || loading) return;

    // Validate entire form before saving
    const validation = validateCampaignDeal(formData, lineItems);
    if (!validation.isValid) {
      sendAlert({
        message: `❌ Please fix the following errors:\n${validation.errors.join('\n')}`,
        variant: "error"
      });
      return;
    }

    setLoading(true);
    
    try {
      const userName = `${context.user.firstName} ${context.user.lastName}`.trim();
      
      // Call all save functions in parallel
      const [basicResponse, detailsResponse, lineItemsResponse] = await Promise.all([
        runServerless({
          name: "saveBasicInformation",
          parameters: {
            campaignDealId: context.crm.objectId,
            campaignName: formData.campaignName,
            commercialAgreement: formData.commercialAgreement,
            advertiser: formData.advertiser,
            dealOwner: formData.dealOwner,
            createdBy: userName
          }
        }),
        runServerless({
          name: "saveCampaignDetails",
          parameters: {
            campaignDealId: context.crm.objectId,
            campaignType: formData.campaignType,
            taxId: formData.taxId,
            businessName: formData.businessName,
            dealCS: formData.dealCS,
            createdBy: userName
          }
        }),
        runServerless({
          name: "saveLineItems",
          parameters: {
            campaignDealId: context.crm.objectId,
            lineItems: lineItems,
            createdBy: userName
          }
        })
      ]);

      // Check if all saves were successful
      const allSuccessful = [basicResponse, detailsResponse, lineItemsResponse].every(
        response => response?.status === "SUCCESS"
      );

      if (allSuccessful) {
        // Update original data to current data
        setOriginalFormData({ ...formData });
        setOriginalLineItems([...lineItems]);
        setHasUnsavedChanges(false);
        
        // Switch to view mode
        setIsEditMode(false);
        
        sendAlert({
          message: "✅ Campaign Deal saved successfully!",
          variant: "success"
        });
        
        console.log("✅ All data saved successfully");
      } else {
        // Handle partial failures
        const failedSections = [];
        if (basicResponse?.status !== "SUCCESS") failedSections.push("Basic Information");
        if (detailsResponse?.status !== "SUCCESS") failedSections.push("Campaign Details");
        if (lineItemsResponse?.status !== "SUCCESS") failedSections.push("Line Items");
        
        throw new Error(`Failed to save: ${failedSections.join(", ")}`);
      }
      
    } catch (error) {
      console.error("❌ Error saving campaign deal:", error);
      sendAlert({
        message: `❌ Save failed: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // === CANCEL CHANGES FUNCTION ===
  const cancelChanges = () => {
    if (!hasUnsavedChanges) {
      setIsEditMode(false);
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel? All unsaved changes will be lost."
    );
    
    if (confirmCancel) {
      // Reset to original data
      setFormData({ ...originalFormData });
      setLineItems([...originalLineItems]);
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      
      sendAlert({
        message: "🔄 Changes cancelled - returned to saved version",
        variant: "info"
      });
    }
  };

  // === DELETE FUNCTION ===
  const deleteRecord = async () => {
    if (isEditMode) {
      sendAlert({
        message: "⚠️ Cannot delete while in edit mode. Please save or cancel changes first.",
        variant: "warning"
      });
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Campaign Deal? This action cannot be undone."
    );
    
    if (confirmDelete) {
      setLoading(true);
      try {
        // TODO: Implement delete function
        // const response = await runServerless({
        //   name: "deleteCampaignDeal",
        //   parameters: { campaignDealId: context.crm.objectId }
        // });
        
        sendAlert({
          message: "🗑️ Delete functionality will be implemented in a future update",
          variant: "warning"
        });
        
      } catch (error) {
        console.error("❌ Error deleting campaign deal:", error);
        sendAlert({
          message: `❌ Delete failed: ${error.message}`,
          variant: "error"
        });
      } finally {
        setLoading(false);
      }
    }
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
            {/* Data Status and Change Indicator */}
            <Box>
              {hasFormData() && (
                <Text variant="microcopy" format={{ color: 'success' }}>
                  📊 Campaign data loaded
                </Text>
              )}
              {isEditMode && hasUnsavedChanges && (
                <Text variant="microcopy" format={{ color: 'warning' }}>
                  ⚠️ Unsaved changes
                </Text>
              )}
            </Box>
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
                  {isEditMode ? (
                    hasUnsavedChanges ? (
                      "⚠️ You have unsaved changes"
                    ) : (
                      "📝 Edit mode - Make your changes"
                    )
                  ) : (
                    hasFormData() ? "👁️ Viewing saved campaign deal" : "📋 No data saved yet"
                  )}
                </Text>
              </Box>

              <Flex gap="medium">
                {/* PREVIEW MODE BUTTONS */}
                {!isEditMode && (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleSwitchToEditMode}
                      disabled={loading}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={deleteRecord}
                      disabled={loading || !hasFormData()}
                    >
                      🗑️ Delete
                    </Button>
                  </>
                )}

                {/* EDIT MODE BUTTONS */}
                {isEditMode && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={cancelChanges}
                      disabled={loading}
                    >
                      ❌ Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={saveAllData}
                      disabled={loading || !hasFormData()}
                    >
                      {loading ? "💾 Saving..." : "💾 Save"}
                    </Button>
                  </>
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