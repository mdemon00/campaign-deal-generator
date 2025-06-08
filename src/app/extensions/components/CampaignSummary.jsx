// src/app/extensions/components/CampaignSummary.jsx
// Simplified version using only HubSpot UI Extension components

import React from "react";
import {
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text,
  Alert
} from "@hubspot/ui-extensions";

import { calculateCampaignSummary, formatCurrency } from '../utils/calculations.js';

const CampaignSummary = ({ 
  lineItems = [], 
  currency = 'USD',
  formData = {},
  isEditMode = false // Accept but don't use (summary is always read-only)
}) => {
  
  const summary = calculateCampaignSummary(lineItems);

  // === CAMPAIGN INFORMATION SUMMARY ===
  const getCampaignInfo = () => {
    const info = [];
    
    if (formData.campaignName) {
      info.push({ label: "Campaign", value: formData.campaignName });
    }
    
    if (formData.company) {
      info.push({ label: "Company", value: formData.company });
    }
    
    if (formData.campaignType) {
      info.push({ label: "Type", value: formData.campaignType });
    }
    
    if (formData.taxId) {
      info.push({ label: "Tax ID", value: formData.taxId });
    }

    return info;
  };

  const campaignInfo = getCampaignInfo();

  // === RENDER HELPER FUNCTIONS ===
  const renderSummaryCard = (label, value, variant = "default") => (
    <Tile compact={true}>
      <Text variant="microcopy" format={{ color: 'medium' }}>
        {label}
      </Text>
      <Heading>
        {value}
      </Heading>
    </Tile>
  );

  const renderInfoItem = (label, value) => (
    <Box marginBottom="small">
      <Flex justify="space-between" align="center">
        <Text variant="microcopy" format={{ fontWeight: "bold", color: 'medium' }}>
          {label}:
        </Text>
        <Text>
          {value}
        </Text>
      </Flex>
    </Box>
  );

  return (
    <Tile>
      <Heading>Campaign Summary</Heading>
      <Divider />
      
      {/* Campaign Information Section */}
      {campaignInfo.length > 0 && (
        <Box marginTop="medium" marginBottom="medium">
          <Text format={{ fontWeight: "bold" }} marginBottom="small">
            📋 Campaign Information
          </Text>
          {campaignInfo.map((info, index) => (
            <Box key={index}>
              {renderInfoItem(info.label, info.value)}
            </Box>
          ))}
        </Box>
      )}

      {/* Financial Summary Section */}
      <Box marginTop="medium">
        <Text format={{ fontWeight: "bold" }} marginBottom="small">
          💰 Financial Summary
        </Text>
        
        <Flex direction="row" gap="medium" wrap="wrap" marginTop="medium">
          {renderSummaryCard(
            "Total Budget", 
            formatCurrency(summary.totalBudget, currency)
          )}
          
          {renderSummaryCard(
            "Total Billable", 
            formatCurrency(summary.totalBillable, currency)
          )}
          
          {renderSummaryCard(
            "Total Bonus", 
            formatCurrency(summary.totalBonus, currency)
          )}
          
          {renderSummaryCard(
            "Line Items", 
            summary.lineItemCount.toString()
          )}
        </Flex>
      </Box>

      {/* Performance Metrics */}
      {summary.lineItemCount > 0 && (
        <Box marginTop="medium">
          <Text format={{ fontWeight: "bold" }} marginBottom="small">
            📊 Performance Metrics
          </Text>
          
          <Flex direction="row" gap="medium" wrap="wrap" marginTop="medium">
            {renderSummaryCard(
              "Avg. Budget per Item", 
              formatCurrency(summary.totalBudget / summary.lineItemCount, currency)
            )}
            
            {renderSummaryCard(
              "Bonus Ratio", 
              `${((summary.totalBonus / summary.totalBillable) * 100 || 0).toFixed(1)}%`
            )}
            
            {renderSummaryCard(
              "Total Value", 
              formatCurrency(summary.totalBillable + summary.totalBonus, currency)
            )}
          </Flex>
        </Box>
      )}

      {/* Empty State */}
      {summary.lineItemCount === 0 && (
        <Box marginTop="medium">
          <Alert variant="info">
            📝 Add line items to see campaign financial summary and metrics.
          </Alert>
        </Box>
      )}

      {/* Campaign Status */}
      <Box marginTop="medium">
        <Divider />
        <Flex justify="space-between" align="center" marginTop="small">
          <Text variant="microcopy" format={{ color: 'medium' }}>
            📅 Campaign Status
          </Text>
          <Text variant="microcopy" format={{ 
            color: summary.lineItemCount > 0 ? 'success' : 'medium',
            fontWeight: "bold" 
          }}>
            {summary.lineItemCount > 0 
              ? `✅ Active with ${summary.lineItemCount} line item${summary.lineItemCount !== 1 ? 's' : ''}`
              : "⏳ Draft - No line items"
            }
          </Text>
        </Flex>
      </Box>
    </Tile>
  );
};

export default CampaignSummary;