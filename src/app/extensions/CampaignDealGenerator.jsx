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
import CampaignDetails from './components/CampaignDetails.jsx'; // ✅ Now enhanced with save/load
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

  // === SAVE STATUS TRACKING ===
  const [basicInfoSaveStatus, setBasicInfoSaveStatus] = useState({
    status: 'not_saved',
    lastSaved: null,
    hasData: false
  });

  // ✅ NEW: Campaign Details Save Status
  const [campaignDetailsSaveStatus, setCampaignDetailsSaveStatus] = useState({
    status: 'not_saved',
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

  // === SAVE STATUS HANDLERS ===
  const handleBasicInfoSaveStatusChange = (statusData) => {
    setBasicInfoSaveStatus(statusData);
    
    // Show alerts for significant status changes
    if (statusData.status === 'Saved') {
      sendAlert({
        message: "✅ Basic information saved successfully!",
        variant: "success"
      });
    }
  };

  // ✅ NEW: Campaign Details Save Status Handler
  const handleCampaignDetailsSaveStatusChange = (statusData) => {
    setCampaignDetailsSaveStatus(statusData);
    
    // Show alerts for significant status changes
    if (statusData.status === 'Saved') {
      sendAlert({
        message: "✅ Campaign details saved successfully!",
        variant: "success"
      });
    }
  };

  // Clear form
  const handleClearForm = () => {
    setFormData(INITIAL_FORM_STATE);
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
    if (basicInfoSaveStatus.status === 'Saved') {
      progress += 1;
    } else if (basicInfoSaveStatus.hasData) {
      progress += 0.5; // Partial credit for filled but unsaved
    }

    // ✅ NEW: Campaign Details Progress
    if (campaignDetailsSaveStatus.status === 'Saved') {
      progress += 1;
    } else if (campaignDetailsSaveStatus.hasData) {
      progress += 0.5; // Partial credit for filled but unsaved
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
    return basicInfoSaveStatus.status === 'Saved';
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
              {campaignDetailsSaveStatus.status === 'Saved' ? "✅ Details" : "⏳ Details"}
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
      {basicInfoSaveStatus.status !== 'Saved' && basicInfoSaveStatus.hasData && (
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
          runServerless={runServerless}
          context={context}
          onSaveStatusChange={handleCampaignDetailsSaveStatusChange}
        />
      </Box>

      {/* Campaign Details Status Alert */}
      {campaignDetailsSaveStatus.status !== 'Saved' && campaignDetailsSaveStatus.hasData && (
        <Box>
          <Alert variant="warning">
            ⚠️ Campaign Details have unsaved changes. Please save to lock in your progress.
          </Alert>
        </Box>
      )}

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
            {(basicInfoSaveStatus.lastSaved || campaignDetailsSaveStatus.lastSaved) && (
              <Text variant="microcopy" format={{ color: 'medium' }}>
                Last saved: 
                {basicInfoSaveStatus.lastSaved && ` Basic Info (${basicInfoSaveStatus.lastSaved})`}
                {basicInfoSaveStatus.lastSaved && campaignDetailsSaveStatus.lastSaved && `, `}
                {campaignDetailsSaveStatus.lastSaved && ` Campaign Details (${campaignDetailsSaveStatus.lastSaved})`}
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