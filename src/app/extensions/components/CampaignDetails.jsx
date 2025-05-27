// src/app/extensions/components/CampaignDetails.jsx

import React from "react";
import {
  Input,
  Select,
  Flex,
  Box,
  Tile,
  Heading,
  Divider
} from "@hubspot/ui-extensions";

import { 
  CAMPAIGN_TYPE_OPTIONS,
  DEAL_CS_OPTIONS
} from '../utils/constants.js';

const CampaignDetails = ({ formData, onChange }) => {
  
  const handleFieldChange = (field, value) => {
    onChange(field, value);
  };

  return (
    <Tile>
      <Heading>Campaign Details</Heading>
      <Divider />
      
      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          <Box flex={1} minWidth="250px">
            <Select
              label="Campaign Type"
              name="campaignType"
              options={CAMPAIGN_TYPE_OPTIONS}
              value={formData.campaignType}
              onChange={(value) => handleFieldChange("campaignType", value)}
            />
          </Box>
          <Box flex={1} minWidth="250px">
            <Input
              label="Tax ID"
              name="taxId"
              placeholder="Enter or create new Tax ID"
              value={formData.taxId}
              onChange={(value) => handleFieldChange("taxId", value)}
            />
          </Box>
        </Flex>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Input
                label="Business Name"
                name="businessName"
                placeholder="Enter business name"
                value={formData.businessName}
                onChange={(value) => handleFieldChange("businessName", value)}
              />
            </Box>
            <Box flex={1} minWidth="250px">
              <Select
                label="Deal CS"
                name="dealCS"
                options={DEAL_CS_OPTIONS}
                value={formData.dealCS}
                onChange={(value) => handleFieldChange("dealCS", value)}
              />
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
};

export default CampaignDetails;