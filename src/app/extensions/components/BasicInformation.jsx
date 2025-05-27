// src/app/extensions/components/BasicInformation.jsx

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
  COMMERCIAL_AGREEMENTS,
  ADVERTISER_OPTIONS,
  DEAL_OWNER_OPTIONS,
  COMMERCIAL_AGREEMENT_MAPPING
} from '../utils/constants.js';

const BasicInformation = ({ formData, onChange }) => {
  
  const handleCommercialAgreementChange = (value) => {
    const mapping = COMMERCIAL_AGREEMENT_MAPPING[value];
    
    // Update multiple fields when commercial agreement changes
    onChange('commercialAgreement', value);
    
    if (mapping) {
      onChange('company', mapping.company);
      onChange('currency', mapping.currency);
    } else {
      onChange('company', '');
      onChange('currency', '');
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === 'commercialAgreement') {
      handleCommercialAgreementChange(value);
    } else {
      onChange(field, value);
    }
  };

  return (
    <Tile>
      <Heading>Basic Information</Heading>
      <Divider />
      
      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          <Box flex={1} minWidth="250px">
            <Input
              label="Campaign Name *"
              name="campaignName"
              placeholder="Enter campaign name"
              value={formData.campaignName}
              onChange={(value) => handleFieldChange("campaignName", value)}
              required
            />
          </Box>
          <Box flex={1} minWidth="250px">
            <Select
              label="Commercial Agreement *"
              name="commercialAgreement"
              options={COMMERCIAL_AGREEMENTS}
              value={formData.commercialAgreement}
              onChange={(value) => handleFieldChange("commercialAgreement", value)}
              required
            />
          </Box>
        </Flex>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Input
                label="Company"
                name="company"
                placeholder="Auto-populated from agreement"
                value={formData.company}
                readOnly
              />
            </Box>
            <Box flex={1} minWidth="250px">
              <Select
                label="Advertiser *"
                name="advertiser"
                options={ADVERTISER_OPTIONS}
                value={formData.advertiser}
                onChange={(value) => handleFieldChange("advertiser", value)}
                required
              />
            </Box>
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Select
                label="Deal Owner *"
                name="dealOwner"
                options={DEAL_OWNER_OPTIONS}
                value={formData.dealOwner}
                onChange={(value) => handleFieldChange("dealOwner", value)}
                required
              />
            </Box>
            <Box flex={1} minWidth="250px">
              <Input
                label="Currency"
                name="currency"
                value={formData.currency}
                readOnly
              />
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
};

export default BasicInformation;