// src/app/extensions/components/CampaignSummary.jsx

import React from "react";
import {
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text
} from "@hubspot/ui-extensions";

import { calculateCampaignSummary, formatCurrency } from '../utils/calculations.js';

const CampaignSummary = ({ lineItems, currency = 'USD' }) => {
  const summary = calculateCampaignSummary(lineItems);

  return (
    <Tile style={{ backgroundColor: "#f8f9fa" }}>
      <Heading>Campaign Summary</Heading>
      <Divider />
      
      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          <Tile compact={true} style={{ backgroundColor: "white", flex: 1, minWidth: "150px" }}>
            <Text variant="microcopy">Total Budget</Text>
            <Heading>{formatCurrency(summary.totalBudget, currency)}</Heading>
          </Tile>
          
          <Tile compact={true} style={{ backgroundColor: "white", flex: 1, minWidth: "150px" }}>
            <Text variant="microcopy">Total Billable</Text>
            <Heading>{formatCurrency(summary.totalBillable, currency)}</Heading>
          </Tile>
          
          <Tile compact={true} style={{ backgroundColor: "white", flex: 1, minWidth: "150px" }}>
            <Text variant="microcopy">Total Bonus</Text>
            <Heading>{formatCurrency(summary.totalBonus, currency)}</Heading>
          </Tile>
          
          <Tile compact={true} style={{ backgroundColor: "white", flex: 1, minWidth: "150px" }}>
            <Text variant="microcopy">Line Items</Text>
            <Heading>{summary.lineItemCount}</Heading>
          </Tile>
        </Flex>
      </Box>
    </Tile>
  );
};

export default CampaignSummary;