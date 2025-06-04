// src/app/extensions/CampaignDealGenerator.jsx

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
import { INITIAL_FORM_STATE } from './utils/constants.js';
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

  // Form state - focused on Basic Information and Campaign Details
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Line items state (for future use)
  // const [lineItems, setLineItems] = useState([]);

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

  // Handle form submission (Basic Info + Campaign Details)
  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Validate basic information
      const validation = validateBasicInformation(formData);
      if (!validation.isValid) {
        throw new Error(`Please fix the following errors: ${validation.errors.join(', ')}`);
      }

      const campaignData = {
        ...formData,
        objectId,
        objectType,
        createdBy: userName,
        timestamp: new Date().toISOString()
      };

      // Here you would call your serverless function to save the campaign deal
      // const response = await runServerless({
      //   name: "saveCampaignDeal",
      //   parameters: campaignData
      // });

      console.log("Campaign Deal Data:", campaignData);

      handleAlert({
        message: "Campaign Deal saved successfully! 🎉",
        variant: "success"
      });

      sendAlert({
        message: "Campaign Deal information saved successfully!",
        variant: "success"
      });

    } catch (error) {
      console.error("Error saving campaign deal:", error);
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
    handleAlert({
      message: "Form cleared successfully",
      variant: "success"
    });
  };

  return (
    <Flex direction="column" gap="large">
      {/* Header Section */}
      <Box>
        <Divider />
        <Heading>Campaign Deal Generator</Heading>
        <Text variant="microcopy">Create and manage campaign deals - Basic Information & Details</Text>
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
          runServerless={runServerless}  // This passes it to BasicInformation
        />
      </Box>

      {/* Campaign Details Section */}
      <Box>
        <CampaignDetails
          formData={formData}
          onChange={handleFormChange}
        />
      </Box>

      {/* Line Items Section - Commented out with proper spacing for when it's enabled */}
      {/* 
      <Divider />
      <Box>
        <LineItems 
          lineItems={lineItems}
          onLineItemsChange={setLineItems}
          onAlert={handleAlert}
        />
      </Box>
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

      {/* Form Actions Section */}
      <Box>
        <Flex gap="medium" justify="end">
          <Button
            variant="secondary"
            onClick={handleClearForm}
            disabled={loading}
          >
            Clear Form
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Campaign Deal"}
          </Button>
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