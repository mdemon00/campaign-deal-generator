// src/app/extensions/components/LineItems.jsx
// Corrected version with NO HTML elements - only HubSpot UI components

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
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
  COMPONENT_SAVE_STATES,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

import { calculateLineItemTotals } from '../utils/calculations.js';
import { validateLineItem } from '../utils/validation.js';

const LineItems = forwardRef(({
  lineItems,
  onLineItemsChange,
  onAlert,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false,
  currency = "MXN"
}, ref) => {

  // === LINE ITEM FORM STATE ===
  const [newLineItem, setNewLineItem] = useState({
    name: "",
    country: "MX",
    type: "initial",
    startDate: null,
    endDate: null,
    
    // Product selection fields
    productId: "",
    selectedProduct: null,
    
    // Pricing fields (auto-populated from product)
    price: 0,
    buyingModel: "",
    units: "",
    category: "",
    
    // Quantity fields
    billable: 0,
    bonus: 0
  });

  const [lineItemCounter, setLineItemCounter] = useState(0);

  // === PRODUCT CATALOG STATE ===
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [hasProductsLoaded, setHasProductsLoaded] = useState(false);

  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLineItems, setInitialLineItems] = useState([]);

  // === COMPONENT INITIALIZATION ===

  // Load product catalog and saved line items on component mount
  useEffect(() => {
    if (runServerless && isEditMode) {
      loadProductCatalog();
      if (context?.crm?.objectId) {
        loadLineItems();
      }
    }
  }, [runServerless, isEditMode, context?.crm?.objectId, currency]);

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

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!lineItems || lineItems.length === 0) {
        return "Please add at least one line item.";
      }
      await saveLineItems();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Line Items.";
      return null;
    }
  }));

  // === PRODUCT CATALOG FUNCTIONS ===
  
  const loadProductCatalog = async () => {
    if (!runServerless || !isEditMode) return;

    setIsProductsLoading(true);

    try {
      const response = await runServerless({
        name: "getProductCatalog",
        parameters: {
          currency: currency,
          limit: 100
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;
        
        // Add default "Select Product" option
        const productOptions = [
          { label: "Select Product", value: "", isAvailable: true, hasStandardPricing: true },
          ...data.products
        ];
        
        setProducts(productOptions);
        setHasProductsLoaded(true);
        
        // console.log($2
      } else {
        throw new Error(response?.response?.message || "Failed to load product catalog");
      }
    } catch (error) {
      console.error("❌ Error loading product catalog:", error);
      onAlert({
        message: `Failed to load product catalog: ${error.message}`,
        variant: "error"
      });
      
      // Set fallback empty state
      setProducts([{ label: "Select Product", value: "", isAvailable: true, hasStandardPricing: true }]);
    } finally {
      setIsProductsLoading(false);
    }
  };


  // === PRODUCT SELECTION HANDLERS ===
  
  const handleProductSelection = (productId) => {
    if (!isEditMode) return;

    const selectedProduct = products.find(p => p.value === productId);
    
    if (!selectedProduct || selectedProduct.value === "") {
      // Clear product selection
      setNewLineItem(prev => ({
        ...prev,
        productId: "",
        selectedProduct: null,
        price: 0,
        buyingModel: "",
        units: "",
        category: "",
        name: "" // Clear name when no product selected
      }));
      return;
    }

    // Auto-populate fields from selected product, including price
    setNewLineItem(prev => ({
      ...prev,
      productId: productId,
      selectedProduct: selectedProduct,
      price: selectedProduct.price || 0, // Always populate price for user to modify
      buyingModel: selectedProduct.buyingModel,
      units: selectedProduct.units,
      category: selectedProduct.category,
      name: selectedProduct.label // Auto-fill name with product name
    }));

    // console.log($2
  };

  // === LINE ITEM MANAGEMENT FUNCTIONS ===
  
  const handleNewLineItemChange = (field, value) => {
    if (!isEditMode) return;

    if (field === 'productId') {
      handleProductSelection(value);
    } else {
      setNewLineItem(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addLineItem = () => {
    if (!isEditMode) return;

    // Enhanced validation including product selection
    if (!newLineItem.productId || newLineItem.productId === "") {
      onAlert({
        message: "Please select a product from the catalog",
        variant: "error"
      });
      return;
    }

    // Validate price is entered
    if (newLineItem.price <= 0) {
      onAlert({
        message: "Please enter a price for this line item",
        variant: "error"
      });
      return;
    }

    // Validate other required fields
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
      ...totals,
      
      // Store product information
      productInfo: {
        productId: newLineItem.productId,
        category: newLineItem.category,
        buyingModel: newLineItem.buyingModel,
        units: newLineItem.units,
        originalPrice: newLineItem.price,
        hasStandardPricing: newLineItem.selectedProduct?.hasStandardPricing || false
      }
    };

    onLineItemsChange([...lineItems, lineItem]);
    setLineItemCounter(newCounter);

    // Reset form but keep product selection filters
    setNewLineItem({
      name: "",
      country: "MX",
      type: "initial",
      startDate: null,
      endDate: null,
      productId: "",
      selectedProduct: null,
      price: 0,
      buyingModel: "",
      units: "",
      category: "",
      billable: 0,
      bonus: 0
    });

    onAlert({
      message: "Line item added successfully!",
      variant: "success"
    });
  };

  // === EXISTING FUNCTIONS ===
  
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

        onLineItemsChange(data.lineItems || []);
        const maxId = Math.max(0, ...data.lineItems.map(item => item.id || 0));
        setLineItemCounter(maxId);
        setInitialLineItems(data.lineItems || []);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: data.lineItems && data.lineItems.length > 0
          });
        }

        // console.log($2
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

        setInitialLineItems([...lineItems]);
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

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

        // console.log($2
      } else {
        throw new Error(response?.response?.message || "Failed to save line items");
      }
    } catch (error) {
      console.error("❌ Error saving line items:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
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

  // === RENDER FUNCTIONS ===
  
  const renderViewModeCell = (value, placeholder = "Not set") => {
    return (
      <Text>
        {value || placeholder}
      </Text>
    );
  };

  const renderLineItemRow = (item, index) => {
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
          <TableCell>-</TableCell>
          {isEditMode && <TableCell>-</TableCell>}
        </TableRow>
      );
    }

    // Format dates
    const formatDate = (dateValue) => {
      if (!dateValue) return 'Date not set';
      if (typeof dateValue === 'object' && dateValue.formattedDate) {
        return dateValue.formattedDate;
      }
      try {
        const dateObj = new Date(dateValue);
        return isNaN(dateObj.getTime()) ? 'Invalid date' : dateObj.toLocaleDateString();
      } catch (error) {
        return 'Invalid date';
      }
    };

    return (
      <TableRow key={item.id || `item-${index}`}>
        <TableCell>{renderViewModeCell(item.id)}</TableCell>
        <TableCell>{renderViewModeCell(item.category || "DSP Display")}</TableCell>
        <TableCell>{renderViewModeCell(item.name)}</TableCell>
        <TableCell>{renderViewModeCell(item.buyingModel || "CPM")}</TableCell>
        <TableCell>{renderViewModeCell(formatDate(item.startDate))}</TableCell>
        <TableCell>{renderViewModeCell(formatDate(item.endDate))}</TableCell>
        <TableCell>{renderViewModeCell(item.price ? `${item.price} ${currency}` : `0.00 ${currency}`)}</TableCell>
        <TableCell>{renderViewModeCell(item.units || "Units")}</TableCell>
        <TableCell>{renderViewModeCell(item.billable)}</TableCell>
        <TableCell>{renderViewModeCell(item.bonus)}</TableCell>
        <TableCell>{renderViewModeCell(item.totalBudget ? `${item.totalBudget.toFixed(2)} ${currency}` : `0.00 ${currency}`)}</TableCell>
        <TableCell>{renderViewModeCell(item.type?.charAt(0).toUpperCase() + item.type?.slice(1))}</TableCell>

        {/* Actions Column - Only show in Edit Mode */}
        {isEditMode && (
          <TableCell>
            <Flex gap="small">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => removeLineItem(index)}
              >
                🗑️ Remove
              </Button>
            </Flex>
          </TableCell>
        )}
      </TableRow>
    );
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

        {/* VIEW MODE INDICATOR */}
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

      {/* PRODUCT CATALOG & ADD NEW LINE ITEM FORM - Only show in Edit Mode */}
      {isEditMode && (
        <Tile>
          <Text format={{ fontWeight: "bold" }}>Add New Line Item</Text>

          {/* Product Catalog Section */}
          <Box marginTop="medium">
            <Text format={{ fontWeight: "bold" }} marginBottom="small">
              📦 Select Product from Catalog
            </Text>


            {/* Product Selection */}
            <Box marginBottom="medium">
              <Select
                label="Product *"
                options={products}
                value={newLineItem.productId}
                onChange={(value) => handleNewLineItemChange("productId", value)}
                disabled={isProductsLoading || !hasProductsLoaded}
                required
              />
              
              {isProductsLoading && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  Loading product catalog...
                </Text>
              )}
            </Box>

          </Box>

          {/* Regular Line Item Fields */}
          <Box marginTop="medium">
            <Flex direction="row" gap="medium" wrap="wrap">
              <Box flex={1} minWidth="200px">
                <Input
                  label="Line Item Name"
                  name="newItemName"
                  placeholder="Auto-filled from product selection"
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
                  label={`Price (${currency})`}
                  name="newItemPrice"
                  placeholder="Enter price"
                  value={newLineItem.price}
                  onChange={(value) => handleNewLineItemChange("price", value)}
                  precision={2}
                />
              </Box>
              <Box flex={1} minWidth="120px">
                <NumberInput
                  label={`Billable ${newLineItem.units || 'Quantity'}`}
                  name="newItemBillable"
                  placeholder="0"
                  value={newLineItem.billable}
                  onChange={(value) => handleNewLineItemChange("billable", value)}
                />
              </Box>
              <Box flex={1} minWidth="120px">
                <NumberInput
                  label={`Bonus ${newLineItem.units || 'Quantity'}`}
                  name="newItemBonus"
                  placeholder="0"
                  value={newLineItem.bonus}
                  onChange={(value) => handleNewLineItemChange("bonus", value)}
                />
              </Box>
            </Flex>
          </Box>

          <Box marginTop="medium">
            <Button 
              onClick={addLineItem} 
              variant="primary"
              disabled={!newLineItem.productId || newLineItem.price <= 0}
            >
              Add Line Item
            </Button>
            {newLineItem.price <= 0 && (
              <Text variant="microcopy" format={{ color: 'error' }} marginTop="small">
                Please enter a price for this line item
              </Text>
            )}
          </Box>
        </Tile>
      )}

      {/* ENHANCED LINE ITEMS TABLE */}
      {lineItems.length > 0 ? (
        <Box marginTop="medium">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>#</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Buying Model</TableHeader>
                <TableHeader>Start Date</TableHeader>
                <TableHeader>End Date</TableHeader>
                <TableHeader>Price</TableHeader>
                <TableHeader>Units</TableHeader>
                <TableHeader>Billable Qty</TableHeader>
                <TableHeader>Bonus Qty</TableHeader>
                <TableHeader>Total Budget</TableHeader>
                <TableHeader>Type</TableHeader>
                {isEditMode && <TableHeader>Actions</TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item, index) => renderLineItemRow(item, index))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        /* Empty State */
        <Box marginTop="medium">
          <Alert variant="info">
            {isEditMode
              ? "📝 No line items yet. Add your first line item by selecting a product from the catalog above."
              : "📋 No line items have been added to this campaign deal yet."
            }
          </Alert>
        </Box>
      )}
    </Tile>
  );
});

export default LineItems;