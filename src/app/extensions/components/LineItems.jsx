// src/app/extensions/components/LineItems.jsx
// Enhanced version with View/Edit Mode functionality

import React, { useState, useEffect } from "react";
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
  TableCell,
  Alert,
  LoadingSpinner
} from "@hubspot/ui-extensions";

import {
  COUNTRY_OPTIONS,
  LINE_ITEM_TYPE_OPTIONS,
  INITIAL_LINE_ITEM_STATE,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

import { calculateLineItemTotals } from '../utils/calculations.js';
import { validateLineItem } from '../utils/validation.js';

const LineItems = ({
  lineItems,
  onLineItemsChange,
  onAlert,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false
}) => {

  // === LINE ITEM FORM STATE ===
  const [newLineItem, setNewLineItem] = useState(INITIAL_LINE_ITEM_STATE);
  const [lineItemCounter, setLineItemCounter] = useState(0);

  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLineItems, setInitialLineItems] = useState([]);

  // === EDITING STATE ===
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // === COMPONENT INITIALIZATION ===

  // Load saved line items on component mount (only in edit mode)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadLineItems();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Track line items changes (only in edit mode)
  useEffect(() => {
    if (initialLineItems.length > 0 && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const hasChanges = JSON.stringify(lineItems) !== JSON.stringify(initialLineItems);

      if (hasChanges && !hasUnsavedChanges) {
        setHasUnsavedChanges(true);
        setSaveState(COMPONENT_SAVE_STATES.MODIFIED);
      } else if (!hasChanges && hasUnsavedChanges) {
        setHasUnsavedChanges(false);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
      }
    }
  }, [lineItems, initialLineItems, saveState, hasUnsavedChanges, isEditMode]);

  // === 🆕 STYLING FUNCTIONS (Simplified) ===
  const getFieldStyle = (hasValue = true) => {
    // Simplified styling for HubSpot UI Extensions
    return {};
  };

  const getTableCellStyle = () => {
    // Simplified styling for HubSpot UI Extensions
    return {};
  };

  // === SAVE/LOAD FUNCTIONS ===
  const loadLineItems = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "loadLineItems",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update line items
        onLineItemsChange(data.lineItems || []);

        // Update counter to continue from max ID
        const maxId = Math.max(0, ...data.lineItems.map(item => item.id || 0));
        setLineItemCounter(maxId);

        // Store initial state for change tracking
        setInitialLineItems(data.lineItems || []);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: data.lineItems && data.lineItems.length > 0
          });
        }

        console.log("✅ Line items loaded successfully");
      } else {
        throw new Error(response?.response?.message || "Failed to load line items");
      }
    } catch (error) {
      console.error("❌ Error loading line items:", error);
      setSaveError(`Failed to load: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveLineItems = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "saveLineItems",
        parameters: {
          campaignDealId: context.crm.objectId,
          lineItems: lineItems,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update tracking state
        setInitialLineItems([...lineItems]);
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: 'Saved',
            lastSaved: data.savedAt,
            hasData: lineItems.length > 0
          });
        }

        onAlert({
          message: "✅ Line items saved successfully!",
          variant: "success"
        });

        console.log("✅ Line items saved successfully");
      } else {
        throw new Error(response?.response?.message || "Failed to save line items");
      }
    } catch (error) {
      console.error("❌ Error saving line items:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  // === LINE ITEM MANAGEMENT FUNCTIONS ===
  const handleNewLineItemChange = (field, value) => {
    if (!isEditMode) return;

    setNewLineItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addLineItem = () => {
    if (!isEditMode) return;

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
    if (!isEditMode) return;

    const updatedItems = lineItems.filter((_, i) => i !== index);
    onLineItemsChange(updatedItems);

    onAlert({
      message: "Line item removed successfully!",
      variant: "success"
    });
  };

  // === INLINE EDITING FUNCTIONS ===
  const startEditingItem = (index) => {
    if (!isEditMode) return;

    // Validate item exists
    if (!lineItems[index]) {
      onAlert({
        message: "Error: Cannot edit this line item - item not found",
        variant: "error"
      });
      return;
    }

    const itemToEdit = lineItems[index];
    
    try {
      const editingCopy = { ...itemToEdit };
      setEditingItemId(itemToEdit.id);
      setEditingItem(editingCopy);
    } catch (error) {
      console.error("Error creating editing copy:", error);
      onAlert({
        message: "Error: Cannot edit this line item - data issue",
        variant: "error"
      });
    }
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditingItem(null);
  };

  const saveEditingItem = () => {
    if (!editingItem || !isEditMode) return;

    // Validate edited item
    const validation = validateLineItem(editingItem);
    if (!validation.isValid) {
      onAlert({
        message: `Please fix the following errors: ${validation.errors.join(', ')}`,
        variant: "error"
      });
      return;
    }

    // Calculate new totals
    const totals = calculateLineItemTotals(editingItem);
    const updatedItem = { ...editingItem, ...totals };

    // Update the line items array
    const updatedItems = lineItems.map(item =>
      item.id === editingItemId ? updatedItem : item
    );

    onLineItemsChange(updatedItems);
    setEditingItemId(null);
    setEditingItem(null);

    onAlert({
      message: "Line item updated successfully!",
      variant: "success"
    });
  };

  const handleEditingItemChange = (field, value) => {
    if (!isEditMode) return;

    setEditingItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // === UI HELPER FUNCTIONS ===
  const getSaveStatusDisplay = () => {
    const message = SAVE_STATUS_MESSAGES[saveState] || SAVE_STATUS_MESSAGES[COMPONENT_SAVE_STATES.NOT_SAVED];
    const color = SAVE_STATUS_COLORS[saveState] || SAVE_STATUS_COLORS[COMPONENT_SAVE_STATES.NOT_SAVED];

    let statusText = message;
    if (saveState === COMPONENT_SAVE_STATES.SAVED && lastSaved) {
      statusText = `${message} on ${lastSaved}`;
    }

    return { message: statusText, color };
  };

  const shouldShowSaveButton = () => {
    return isEditMode && (
      saveState === COMPONENT_SAVE_STATES.NOT_SAVED ||
      saveState === COMPONENT_SAVE_STATES.MODIFIED ||
      saveState === COMPONENT_SAVE_STATES.ERROR
    );
  };

  const isSaveDisabled = () => {
    return saveState === COMPONENT_SAVE_STATES.SAVING ||
      saveState === COMPONENT_SAVE_STATES.LOADING ||
      lineItems.length === 0;
  };

  // === RENDER HELPER FUNCTIONS ===
  const renderViewModeCell = (value, placeholder = "Not set") => {
    return (
      <Text>
        {value || placeholder}
      </Text>
    );
  };

  const renderEditableCell = (item, field, type = "text") => {
    // Safety check for null items
    if (!item) {
      return renderViewModeCell("ERROR: Item not found");
    }

    const isEditing = editingItemId === item.id;
    
    if (isEditing && !editingItem) {
      return renderViewModeCell("ERROR: Editing data not found");
    }

    const currentValue = isEditing ? editingItem[field] : item[field];

    if (!isEditMode || !isEditing) {
      // View mode or non-editing row
      let displayValue = currentValue;

      if (field === 'startDate' || field === 'endDate') {
        if (!currentValue) {
          displayValue = 'Date not set';
        } else if (typeof currentValue === 'object' && currentValue.formattedDate) {
          // HubSpot DateInput object - use the pre-formatted date
          displayValue = currentValue.formattedDate;
        } else {
          // Fallback for other formats
          try {
            const dateObj = new Date(currentValue);
            displayValue = isNaN(dateObj.getTime()) ? 'Invalid date' : dateObj.toLocaleDateString();
          } catch (error) {
            displayValue = 'Invalid date';
          }
        }
      } else if (field === 'price' || field === 'totalBudget') {
        displayValue = currentValue ? `$${Number(currentValue).toFixed(2)}` : '$0.00';
      } else if (field === 'type') {
        const typeOption = LINE_ITEM_TYPE_OPTIONS.find(opt => opt.value === currentValue);
        displayValue = typeOption ? typeOption.label : currentValue;
      } else if (field === 'country') {
        const countryOption = COUNTRY_OPTIONS.find(opt => opt.value === currentValue);
        displayValue = countryOption ? countryOption.label : currentValue;
      }

      return renderViewModeCell(displayValue);
    }

    // Edit mode - show appropriate input
    if (type === "select" && field === "country") {
      return (
        <Select
          options={COUNTRY_OPTIONS}
          value={currentValue}
          onChange={(value) => handleEditingItemChange(field, value)}
        />
      );
    } else if (type === "select" && field === "type") {
      return (
        <Select
          options={LINE_ITEM_TYPE_OPTIONS}
          value={currentValue}
          onChange={(value) => handleEditingItemChange(field, value)}
        />
      );
    } else if (type === "date") {
      return (
        <DateInput
          value={currentValue}
          onChange={(value) => handleEditingItemChange(field, value)}
        />
      );
    } else if (type === "number") {
      return (
        <NumberInput
          value={currentValue}
          onChange={(value) => handleEditingItemChange(field, value)}
          precision={field === 'price' ? 2 : 0}
        />
      );
    } else {
      return (
        <Input
          value={currentValue}
          onChange={(value) => handleEditingItemChange(field, value)}
        />
      );
    }
  };

  const statusDisplay = getSaveStatusDisplay();

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Line Items</Heading>

        {/* Save Status Display - Only show in Edit Mode */}
        {isEditMode && (
          <Flex align="center" gap="small">
            <Text
              variant="microcopy"
              format={{ color: statusDisplay.color }}
            >
              {statusDisplay.message}
            </Text>
            {saveState === COMPONENT_SAVE_STATES.SAVING && <LoadingSpinner size="xs" />}
            {saveState === COMPONENT_SAVE_STATES.LOADING && <LoadingSpinner size="xs" />}
          </Flex>
        )}

        {/* 🆕 VIEW MODE INDICATOR */}
        {!isEditMode && (
          <Text variant="microcopy" format={{ color: 'medium' }}>
            👁️ View Mode - Read Only
          </Text>
        )}
      </Flex>

      <Divider />

      {/* Save Error Alert - Only show in Edit Mode */}
      {isEditMode && saveError && (
        <Box marginTop="small" marginBottom="medium">
          <Alert variant="error">
            {saveError}
          </Alert>
        </Box>
      )}

      {/* 🆕 ADD NEW LINE ITEM FORM - Only show in Edit Mode */}
      {isEditMode && (
        <Tile>
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
        </Tile>
      )}

      {/* 🆕 LINE ITEMS TABLE - View/Edit Mode */}
      {lineItems.length > 0 ? (
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
                {isEditMode && <TableHeader>Actions</TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item, index) => {
                // Safety check for null items
                if (!item) {
                  return (
                    <TableRow key={`error-${index}`}>
                      <TableCell>ERROR</TableCell>
                      <TableCell>Item not found</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      {isEditMode && <TableCell>-</TableCell>}
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={item.id || `item-${index}`}>
                    <TableCell>{renderViewModeCell(item.id)}</TableCell>
                    <TableCell>{renderViewModeCell("DSP Display")}</TableCell>
                    <TableCell>{renderEditableCell(item, "name")}</TableCell>
                    <TableCell>{renderEditableCell(item, "country", "select")}</TableCell>
                    <TableCell>{renderEditableCell(item, "startDate", "date")}</TableCell>
                    <TableCell>{renderEditableCell(item, "endDate", "date")}</TableCell>
                    <TableCell>{renderEditableCell(item, "price", "number")}</TableCell>
                    <TableCell>{renderEditableCell(item, "billable", "number")}</TableCell>
                    <TableCell>{renderEditableCell(item, "bonus", "number")}</TableCell>
                    <TableCell>{renderEditableCell(item, "totalBudget")}</TableCell>
                    <TableCell>{renderEditableCell(item, "type", "select")}</TableCell>

                    {/* Actions Column - Only show in Edit Mode */}
                    {isEditMode && (
                      <TableCell>
                        {editingItemId === item.id ? (
                          <Flex gap="small">
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={saveEditingItem}
                            >
                              ✓ Save
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={cancelEditingItem}
                            >
                              ✕ Cancel
                            </Button>
                          </Flex>
                        ) : (
                          <Flex gap="small">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => startEditingItem(index)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => removeLineItem(index)}
                            >
                              🗑️ Remove
                            </Button>
                          </Flex>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : (
        /* Empty State */
        <Box marginTop="medium">
          <Alert variant="info">
            {isEditMode
              ? "📝 No line items yet. Add your first line item using the form above."
              : "📋 No line items have been added to this campaign deal yet."
            }
          </Alert>
        </Box>
      )}

      {/* Save Button - Only show in Edit Mode */}
      {shouldShowSaveButton() && (
        <Box marginTop="medium">
          <Flex justify="end">
            <Button
              variant="primary"
              onClick={saveLineItems}
              disabled={isSaveDisabled()}
            >
              {saveState === COMPONENT_SAVE_STATES.SAVING ? "Saving..." : "💾 Save Line Items"}
            </Button>
          </Flex>
        </Box>
      )}
    </Tile>
  );
};

export default LineItems;