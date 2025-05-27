// src/app/extensions/components/LineItems.jsx

import React, { useState } from "react";
import {
  Input,
  Select,
  NumberInput,
  DateInput,
  Button,
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell
} from "@hubspot/ui-extensions";

import { 
  COUNTRY_OPTIONS,
  LINE_ITEM_TYPE_OPTIONS,
  INITIAL_LINE_ITEM_STATE
} from '../utils/constants.js';

import { calculateLineItemTotals } from '../utils/calculations.js';
import { validateLineItem } from '../utils/validation.js';

const LineItems = ({ lineItems, onLineItemsChange, onAlert }) => {
  const [newLineItem, setNewLineItem] = useState(INITIAL_LINE_ITEM_STATE);
  const [lineItemCounter, setLineItemCounter] = useState(0);

  const handleNewLineItemChange = (field, value) => {
    setNewLineItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addLineItem = () => {
    // Validate line item
    const validation = validateLineItem(newLineItem);
    if (!validation.isValid) {
      onAlert({
        message: `Please fix the following errors: ${validation.errors.join(', ')}`,
        variant: "error"
      });
      return;
    }

    const newCounter = lineItemCounter + 1;
    const totals = calculateLineItemTotals(newLineItem);

    const lineItem = {
      id: newCounter,
      ...newLineItem,
      ...totals
    };

    onLineItemsChange([...lineItems, lineItem]);
    setLineItemCounter(newCounter);
    
    // Reset form
    setNewLineItem(INITIAL_LINE_ITEM_STATE);

    onAlert({
      message: "Line item added successfully!",
      variant: "success"
    });
  };

  const removeLineItem = (index) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    onLineItemsChange(updatedItems);
    
    onAlert({
      message: "Line item removed successfully!",
      variant: "success"
    });
  };

  return (
    <Tile>
      <Heading>Line Items</Heading>
      <Divider />
      
      {/* New Line Item Form */}
      <Box marginTop="medium" padding="medium" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
        <Text format={{ fontWeight: "bold" }}>Add New Line Item</Text>
        
        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="200px">
              <Input
                label="Line Item Name *"
                name="newItemName"
                placeholder="Enter line item name"
                value={newLineItem.name}
                onChange={(value) => handleNewLineItemChange("name", value)}
              />
            </Box>
            <Box flex={1} minWidth="200px">
              <Select
                label="Country"
                name="newItemCountry"
                options={COUNTRY_OPTIONS}
                value={newLineItem.country}
                onChange={(value) => handleNewLineItemChange("country", value)}
              />
            </Box>
            <Box flex={1} minWidth="200px">
              <Select
                label="Type"
                name="newItemType"
                options={LINE_ITEM_TYPE_OPTIONS}
                value={newLineItem.type}
                onChange={(value) => handleNewLineItemChange("type", value)}
              />
            </Box>
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="150px">
              <DateInput
                label="Start Date *"
                name="newItemStartDate"
                value={newLineItem.startDate}
                onChange={(value) => handleNewLineItemChange("startDate", value)}
              />
            </Box>
            <Box flex={1} minWidth="150px">
              <DateInput
                label="End Date *"
                name="newItemEndDate"
                value={newLineItem.endDate}
                onChange={(value) => handleNewLineItemChange("endDate", value)}
              />
            </Box>
            <Box flex={1} minWidth="120px">
              <NumberInput
                label="Price"
                name="newItemPrice"
                placeholder="0.00"
                value={newLineItem.price}
                onChange={(value) => handleNewLineItemChange("price", value)}
                precision={2}
              />
            </Box>
            <Box flex={1} minWidth="120px">
              <NumberInput
                label="Billable Qty"
                name="newItemBillable"
                placeholder="0"
                value={newLineItem.billable}
                onChange={(value) => handleNewLineItemChange("billable", value)}
              />
            </Box>
            <Box flex={1} minWidth="120px">
              <NumberInput
                label="Bonus Qty"
                name="newItemBonus"
                placeholder="0"
                value={newLineItem.bonus}
                onChange={(value) => handleNewLineItemChange("bonus", value)}
              />
            </Box>
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Button onClick={addLineItem} variant="primary">
            Add Line Item
          </Button>
        </Box>
      </Box>

      {/* Line Items Table */}
      {lineItems.length > 0 && (
        <Box marginTop="medium">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>#</TableHeader>
                <TableHeader>Line Item</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Country</TableHeader>
                <TableHeader>Start Date</TableHeader>
                <TableHeader>End Date</TableHeader>
                <TableHeader>Price</TableHeader>
                <TableHeader>Billable Qty</TableHeader>
                <TableHeader>Bonus Qty</TableHeader>
                <TableHeader>Total Budget</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>DSP Display</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.country}</TableCell>
                  <TableCell>{item.startDate ? new Date(item.startDate).toLocaleDateString() : ''}</TableCell>
                  <TableCell>{item.endDate ? new Date(item.endDate).toLocaleDateString() : ''}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>{item.billable}</TableCell>
                  <TableCell>{item.bonus}</TableCell>
                  <TableCell>${item.totalBudget.toFixed(2)}</TableCell>
                  <TableCell>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="destructive" 
                      onClick={() => removeLineItem(index)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Tile>
  );
};

export default LineItems;