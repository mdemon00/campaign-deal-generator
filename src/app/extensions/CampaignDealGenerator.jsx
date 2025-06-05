// src/app/extensions/CampaignDealGenerator.jsx
// Enhanced version with save/load functionality

import React, { useState } from "react";
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
// import LineItems from './components/LineItems.jsx';
// import CampaignSummary from './components/CampaignSummary.jsx';

// Import utilities
import { 
  INITIAL_FORM_STATE,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS,
  SAVE_STATUS_MESSAGES
} from './utils/constants.js';
import { validateBasicInformation } from './utils/validation.js';

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <CampaignDealExtension
    context={context}
    runServerless={runServerlessFunction}
    sendAlert={actions.addAlert}
  />
));

const CampaignDealExtension = ({ context, runServerless, sendAlert }) => {
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Get current object information
  const objectId = context.crm.objectId;
  const objectType = context.crm.objectType;
  const userName = `${context.user.firstName} ${context.user.lastName}`;

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // === NEW: Save Status Tracking ===
  const [basicInfoSaveStatus, setBasicInfoSaveStatus] = useState({
    status: 'not_saved', // ✅ Fixed: Use correct enumeration value
    lastSaved: null,
    hasData: false
  });

  // Line items state (for future use)
  // const [lineItems, setLineItems] = useState([]);

  // === FORM HANDLERS ===

  // Handle form field changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle alert messages
  const handleAlert = (alertData) => {
    setAlertMessage(alertData);
    setTimeout(() => setAlertMessage(""), 4000);
  };

  // === NEW: Save Status Handler ===
  const handleBasicInfoSaveStatusChange = (statusData) => {
    setBasicInfoSaveStatus(statusData);
    
    // Show alerts for significant status changes
    if (statusData.status === 'Saved') { // ✅ Fixed: Capital S
      sendAlert({
        message: "✅ Basic information saved successfully!",
        variant: "success"
      });
    }
  };

  // === CAMPAIGN DETAILS SUBMISSION ===
  const handleSubmitCampaignDetails = async () => {
    setLoading(true);

    try {
      // Validate basic information first
      const validation = validateBasicInformation(formData);
      if (!validation.isValid) {
        throw new Error(`Please fix the following errors: ${validation.errors.join(', ')}`);
      }

      // Check if basic info is saved
      if (basicInfoSaveStatus.status !== 'Saved') { // ✅ Fixed: Capital S
        throw new Error("Please save Basic Information before proceeding with Campaign Details");
      }

      const campaignData = {
        ...formData,
        objectId,
        objectType,
        createdBy: userName,
        timestamp: new Date().toISOString()
      };

      // Here you would call your serverless function to save campaign details
      // const response = await runServerless({
      //   name: "saveCampaignDetails",
      //   parameters: campaignData
      // });

      console.log("Campaign Details Data:", campaignData);

      handleAlert({
        message: "Campaign Details saved successfully! 🎉",
        variant: "success"
      });

      sendAlert({
        message: "Campaign Details saved successfully!",
        variant: "success"
      });

    } catch (error) {
      console.error("Error saving campaign details:", error);
      handleAlert({
        message: `Error: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear form
  const handleClearForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setBasicInfoSaveStatus({
      status: 'not_saved', // ✅ Fixed: Use correct enumeration value
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
    let total = 2; // Basic Info + Campaign Details (Line Items disabled for now)

    // Basic Information Progress
    if (basicInfoSaveStatus.status === 'Saved') { // ✅ Fixed: Capital S
      progress += 1;
    } else if (basicInfoSaveStatus.hasData) {
      progress += 0.5; // Partial credit for filled but unsaved
    }

    // Campaign Details Progress (simplified check)
    if (formData.campaignType && formData.taxId && formData.businessName && formData.dealCS) {
      progress += 1;
    } else if (formData.campaignType || formData.taxId || formData.businessName || formData.dealCS) {
      progress += 0.5; // Partial credit
    }

    return { progress, total, percentage: Math.round((progress / total) * 100) };
  };

  const progressInfo = getOverallProgress();

  const getProgressColor = () => {
    if (progressInfo.percentage >= 100) return "success";
    if (progressInfo.percentage >= 50) return "warning";
    return "medium";
  };

  const shouldShowCampaignDetailsActions = () => {
    return basicInfoSaveStatus.status === 'Saved'; // ✅ Fixed: Capital S
  };

  return (
    <Flex direction="column" gap="large">
      {/* Header Section */}
      <Box>
        <Divider />
        <Flex justify="space-between" align="center">
          <Box>
            <Heading>Campaign Deal Generator</Heading>
            <Text variant="microcopy">Create and manage campaign deals - Basic Information & Details</Text>
          </Box>
          
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
              {formData.campaignType ? "✅ Details" : "⏳ Details"}
            </Text>
          </Box>
        </Flex>
        <Divider />
      </Box>

      {/* Test Connection - Commented out but with proper spacing when enabled */}
      {/* 
      <Box>
        <TestConnection 
          context={context}
          runServerless={runServerless}
          onResult={handleAlert}
        />
      </Box>
      */}

      {/* Basic Information Section */}
      <Box>
        <BasicInformation
          formData={formData}
          onChange={handleFormChange}
          runServerless={runServerless}
          context={context}
          onSaveStatusChange={handleBasicInfoSaveStatusChange}
        />
      </Box>

      {/* Basic Info Status Alert */}
      {basicInfoSaveStatus.status !== 'Saved' && basicInfoSaveStatus.hasData && ( // ✅ Fixed: Capital S
        <Box>
          <Alert variant="warning">
            ⚠️ Basic Information has unsaved changes. Please save before proceeding to Campaign Details.
          </Alert>
        </Box>
      )}

      {/* Campaign Details Section */}
      <Box>
        <CampaignDetails
          formData={formData}
          onChange={handleFormChange}
        />
        
        {/* Campaign Details Actions */}
        {shouldShowCampaignDetailsActions() && (
          <Box marginTop="medium">
            <Flex gap="medium" justify="end">
              <Button
                variant="primary"
                onClick={handleSubmitCampaignDetails}
                disabled={loading || !formData.campaignType}
              >
                {loading ? "Saving..." : "💾 Save Campaign Details"}
              </Button>
            </Flex>
          </Box>
        )}
        
        {/* Locked Message */}
        {!shouldShowCampaignDetailsActions() && (
          <Box marginTop="medium">
            <Alert variant="info">
              🔒 Complete and save Basic Information to unlock Campaign Details
            </Alert>
          </Box>
        )}
      </Box>

      {/* Line Items Section - Commented out with proper spacing for when it's enabled */}
      {/* 
      {shouldShowCampaignDetailsActions() && (
        <>
          <Divider />
          <Box>
            <LineItems 
              lineItems={lineItems}
              onLineItemsChange={setLineItems}
              onAlert={handleAlert}
            />
          </Box>
        </>
      )}
      */}

      {/* Campaign Summary - Commented out with proper spacing for when it's enabled */}
      {/* 
      <Divider />
      <Box>
        <CampaignSummary 
          lineItems={lineItems}
          currency={formData.currency}
        />
      </Box>
      */}

      {/* Global Form Actions Section */}
      <Box>
        <Divider />
        <Flex gap="medium" justify="space-between" align="center">
          <Box>
            {basicInfoSaveStatus.lastSaved && (
              <Text variant="microcopy" format={{ color: 'medium' }}>
                Last saved: {basicInfoSaveStatus.lastSaved}
              </Text>
            )}
          </Box>
          
          <Flex gap="medium">
            <Button
              variant="secondary"
              onClick={handleClearForm}
              disabled={loading}
            >
              🗑️ Clear All
            </Button>
            
            {/* Future: Final submission button when all sections are complete */}
            {/* 
            <Button
              variant="primary"
              onClick={handleFinalSubmit}
              disabled={loading || progressInfo.percentage < 100}
            >
              {loading ? "Creating..." : "🚀 Create Campaign Deal"}
            </Button>
            */}
          </Flex>
        </Flex>
      </Box>

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