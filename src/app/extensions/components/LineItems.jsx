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
    bonus: 0,

    // Agreement pricing indicator
    hasAgreementPricing: false
  });

  const [lineItemCounter, setLineItemCounter] = useState(0);

  // === EDIT MODE STATE ===
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [isFormInEditMode, setIsFormInEditMode] = useState(false);

  // === PRODUCT CATALOG STATE ===
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [hasProductsLoaded, setHasProductsLoaded] = useState(false);
  const [agreementProducts, setAgreementProducts] = useState([]);

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



  // Watch for agreement products changes and update current selected product price and dates
  useEffect(() => {
    if (newLineItem.selectedProduct && newLineItem.productId) {
      console.log('🔄 Agreement products changed, recalculating price and dates for selected product');

      // Recalculate price for currently selected product
      let finalPrice = newLineItem.selectedProduct.price || 0;
      let hasAgreementPricing = false;

      if (agreementProducts && agreementProducts.length > 0) {
        // Create matching key for agreement lookup
        const lookupKey = `${newLineItem.selectedProduct.category}_${newLineItem.selectedProduct.media}_${newLineItem.selectedProduct.contentType}_${newLineItem.selectedProduct.buyingModel}`.toLowerCase();

        // Find matching agreement product
        const matchingAgreementProduct = agreementProducts.find(agreementProduct => {
          const values = agreementProduct.values;
          const agreementKey = `${values.name}_${values.media}_${values.content_type}_${values.buying_model}`.toLowerCase();
          return agreementKey === lookupKey;
        });

        if (matchingAgreementProduct) {
          const values = matchingAgreementProduct.values;

          // Override pricing
          finalPrice = values.pircing || 0;
          hasAgreementPricing = true;

          console.log(`🎯 Updated agreement data for ${newLineItem.selectedProduct.category}:`);
          console.log(`   💰 Price: ${finalPrice} ${currency} (was: ${newLineItem.selectedProduct.price})`);
        }
      }

      // Update the price if it changed
      const needsUpdate = (
        finalPrice !== newLineItem.price ||
        hasAgreementPricing !== newLineItem.hasAgreementPricing
      );

      if (needsUpdate) {
        setNewLineItem(prev => ({
          ...prev,
          price: finalPrice,
          hasAgreementPricing: hasAgreementPricing
        }));
        console.log(`💰 Price automatically updated to: ${finalPrice} ${currency}`);
      }
    }
  }, [agreementProducts, currency]); // Watch for changes to agreement products

  // Function to load agreement products when commercial agreement is selected
  const loadAgreementProducts = async (commercialAgreementId) => {
    if (!runServerless || !commercialAgreementId) {
      console.log('🔄 Clearing agreement products - no commercial agreement selected');
      setAgreementProducts([]);
      
      // Reload product catalog without agreement products
      if (hasProductsLoaded) {
        await loadProductCatalogWithAgreementProducts([]);
      }
      return;
    }

    try {
      console.log(`🔄 Loading agreement products for commercial agreement: ${commercialAgreementId}`);
      
      const response = await runServerless({
        name: "fetchProductsForDeal",
        parameters: {
          dealId: commercialAgreementId // Use commercial agreement ID to fetch products
        }
      });

      console.log('🔍 Raw response from fetchProductsForDeal:', response);

      if (response?.status === "SUCCESS") {
        console.log('🔍 Response.response:', response.response);
        console.log('🔍 Response.response type:', typeof response.response);
        console.log('🔍 Response.response isArray:', Array.isArray(response.response));
        
        // Handle double-wrapped response structure
        let products = [];
        if (Array.isArray(response.response)) {
          products = response.response;
        } else if (response.response?.response && Array.isArray(response.response.response)) {
          products = response.response.response;
          console.log('🔍 Found double-wrapped response, using inner array');
        }
        
        setAgreementProducts(products);
        
        if (products.length > 0) {
          console.log(`✅ Loaded ${products.length} agreement products`);
          // Safely map through products
          try {
            const productSummary = products.map(p => ({
              name: p?.values?.name || 'Unknown',
              media: p?.values?.media || 'Unknown',
              contentType: p?.values?.content_type || 'Unknown',
              buyingModel: p?.values?.buying_model || 'Unknown',
              price: p?.values?.pircing || 0,
              currency: p?.values?.currency || 'Unknown'
            }));
            console.log('📋 Product details:', productSummary);
          } catch (mapError) {
            console.error('❌ Error mapping product details:', mapError);
            console.log('🔍 Products data:', products);
          }
        } else {
          console.log(`ℹ️ No agreement products found for commercial agreement: ${commercialAgreementId}`);
        }

        // Reload product catalog to apply agreement pricing overrides
        // Pass the products directly since state update is asynchronous
        if (hasProductsLoaded) {
          await loadProductCatalogWithAgreementProducts(products);
        }
      } else {
        console.log('❌ Failed to load agreement products. Status:', response?.status);
        console.log('❌ Response message:', response?.message);
        console.log('❌ Full response:', response);
        setAgreementProducts([]);
      }
    } catch (error) {
      console.error('❌ Error loading agreement products:', error);
      setAgreementProducts([]);
    }
  };

  // Expose save method and agreement products loading to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!lineItems || lineItems.length === 0) {
        return "Please add at least one line item.";
      }
      await saveLineItems();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Line Items.";
      return null;
    },
    loadAgreementProducts: loadAgreementProducts
  }));

  // === PRODUCT CATALOG FUNCTIONS ===

  const loadProductCatalogWithAgreementProducts = async (agreementProductsToUse = null) => {
    if (!runServerless || !isEditMode) return;

    setIsProductsLoading(true);

    // Use provided agreement products or fall back to state
    const productsToUse = agreementProductsToUse || agreementProducts;

    try {
      console.log(`🔄 Loading product catalog with ${productsToUse.length} agreement products`);
      
      const response = await runServerless({
        name: "getProductCatalog",
        parameters: {
          currency: currency,
          limit: 100,
          agreementProducts: productsToUse // Pass agreement products for pricing overrides
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

        console.log(`✅ Product catalog loaded with ${productsToUse.length} agreement pricing overrides`);
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

  const loadProductCatalog = async () => {
    if (!runServerless || !isEditMode) return;

    setIsProductsLoading(true);

    try {
      const response = await runServerless({
        name: "getProductCatalog",
        parameters: {
          currency: currency,
          limit: 100,
          agreementProducts: agreementProducts // Pass agreement products for pricing overrides
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

        console.log(`✅ Product catalog loaded with ${agreementProducts.length} agreement pricing overrides`);
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
        name: "", // Clear name when no product selected
        hasAgreementPricing: false
      }));
      return;
    }

    // Check for agreement pricing override
    let finalPrice = selectedProduct.price || 0;
    let hasAgreementPricing = false;

    if (agreementProducts && agreementProducts.length > 0) {
      // Create matching key for agreement lookup
      const lookupKey = `${selectedProduct.category}_${selectedProduct.media}_${selectedProduct.contentType}_${selectedProduct.buyingModel}`.toLowerCase();

      // Find matching agreement product
      const matchingAgreementProduct = agreementProducts.find(agreementProduct => {
        const values = agreementProduct.values;
        const agreementKey = `${values.name}_${values.media}_${values.content_type}_${values.buying_model}`.toLowerCase();
        return agreementKey === lookupKey;
      });

      if (matchingAgreementProduct) {
        const values = matchingAgreementProduct.values;

        // Override pricing
        finalPrice = values.pircing || 0;
        hasAgreementPricing = true;

        console.log(`🎯 Using agreement data for ${selectedProduct.category}:`);
        console.log(`   💰 Price: ${finalPrice} ${currency} (was: ${selectedProduct.price})`);
      }
    }

    // Auto-populate fields from selected product with agreement overrides if available
    setNewLineItem(prev => ({
      ...prev,
      productId: productId,
      selectedProduct: selectedProduct,
      price: finalPrice,
      buyingModel: selectedProduct.buyingModel,
      units: selectedProduct.units,
      category: selectedProduct.category,
      name: selectedProduct.label, // Auto-fill name with product name
      hasAgreementPricing: hasAgreementPricing
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
      bonus: 0,
      hasAgreementPricing: false
    });

    onAlert({
      message: "Line item added successfully!",
      variant: "success"
    });
  };

  // === EDIT MODE FUNCTIONS ===

  const startEditingLineItem = (index) => {
    if (!isEditMode) return;

    const itemToEdit = lineItems[index];
    if (!itemToEdit) return;

    // Ensure products are loaded before editing
    if (!hasProductsLoaded) {
      onAlert({
        message: "Please wait for products to load before editing",
        variant: "warning"
      });
      return;
    }

    // Get product ID from multiple possible sources (for backward compatibility)
    const productId = itemToEdit.productInfo?.productId || itemToEdit.productId || "";
    
    // Find the selected product from the products list
    let selectedProduct = null;
    
    if (productId) {
      selectedProduct = products.find(p => p.value === productId) || null;
    }
    
    // If no productId or product not found, try to match by product characteristics
    if (!selectedProduct && (itemToEdit.category || itemToEdit.buyingModel)) {
      selectedProduct = products.find(p => 
        p.category === itemToEdit.category && 
        p.buyingModel === itemToEdit.buyingModel &&
        p.units === itemToEdit.units
      ) || null;
      
      if (selectedProduct) {
        console.log('🔍 Found product by matching characteristics:', selectedProduct.label);
      }
    }
    
    // If still not found, try to match by parsing the product name
    if (!selectedProduct && itemToEdit.name) {
      // Parse the name format: "Product Name - Media Type (Buying Model)"
      // Example: "DSP Display Branding - Web & Mobile Display (CPM)"
      
      selectedProduct = products.find(p => {
        if (!p.label || p.value === "") return false;
        
        // Try exact name match first
        if (p.label === itemToEdit.name) return true;
        
        // Try matching parts of the name
        const itemNameLower = itemToEdit.name.toLowerCase();
        const productLabelLower = p.label.toLowerCase();
        
        // Check if the product label is contained in the item name
        return itemNameLower.includes(productLabelLower) || productLabelLower.includes(itemNameLower);
      }) || null;
      
      if (selectedProduct) {
        console.log('🎯 Found product by name matching:', {
          itemName: itemToEdit.name,
          foundProduct: selectedProduct.label
        });
      } else {
        // Log available products to help debug
        console.log('❌ Could not match product. Available products:', products.map(p => ({
          value: p.value,
          label: p.label,
          category: p.category,
          buyingModel: p.buyingModel
        })));
        console.log('❌ Trying to match item:', {
          name: itemToEdit.name,
          category: itemToEdit.category,
          buyingModel: itemToEdit.buyingModel
        });
      }
    }
    
    // If still not found, reconstruct it from stored data
    if (!selectedProduct && (productId || itemToEdit.category)) {
      selectedProduct = {
        value: productId || `custom_${Date.now()}`,
        label: itemToEdit.name || 'Unknown Product',
        category: itemToEdit.category || '',
        buyingModel: itemToEdit.buyingModel || '',
        units: itemToEdit.units || '',
        price: itemToEdit.productInfo?.originalPrice || itemToEdit.price || 0,
        hasStandardPricing: itemToEdit.productInfo?.hasStandardPricing || false
      };
      console.log('⚠️ Product not found in catalog, reconstructed from stored data:', selectedProduct);
    }

    // Populate form with existing item data
    setNewLineItem({
      name: itemToEdit.name || "",
      country: itemToEdit.country || "MX",
      type: itemToEdit.type || "initial",
      startDate: itemToEdit.startDate || null,
      endDate: itemToEdit.endDate || null,
      productId: productId,
      selectedProduct: selectedProduct,
      price: itemToEdit.price || 0,
      buyingModel: itemToEdit.buyingModel || "",
      units: itemToEdit.units || "",
      category: itemToEdit.category || "",
      billable: itemToEdit.billable || 0,
      bonus: itemToEdit.bonus || 0,
      hasAgreementPricing: itemToEdit.hasAgreementPricing || false
    });

    setEditingItemIndex(index);
    setIsFormInEditMode(true);

    console.log('📝 Starting edit for line item:', {
      index,
      productId: productId,
      selectedProduct: selectedProduct?.label,
      itemData: {
        name: itemToEdit.name,
        category: itemToEdit.category,
        buyingModel: itemToEdit.buyingModel,
        hasProductInfo: !!itemToEdit.productInfo
      }
    });

    onAlert({
      message: `Editing line item: ${itemToEdit.name || 'Unnamed item'}`,
      variant: "info"
    });
  };

  const cancelEditLineItem = () => {
    if (!isEditMode) return;

    // Reset form to empty state
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
      bonus: 0,
      hasAgreementPricing: false
    });

    setEditingItemIndex(null);
    setIsFormInEditMode(false);

    onAlert({
      message: "Edit cancelled",
      variant: "info"
    });
  };

  const updateLineItem = () => {
    if (!isEditMode || editingItemIndex === null) return;

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

    const totals = calculateLineItemTotals(newLineItem);
    const originalItem = lineItems[editingItemIndex];

    const updatedItem = {
      ...originalItem,
      ...newLineItem,
      ...totals,
      id: originalItem.id, // Keep original ID

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

    // Update the line items array
    const updatedItems = [...lineItems];
    updatedItems[editingItemIndex] = updatedItem;
    onLineItemsChange(updatedItems);

    // Reset form and edit state
    cancelEditLineItem();

    onAlert({
      message: "Line item updated successfully!",
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
            hasData: data.lineItems && data.lineItems.length > 0,
            isUserSave: false // This is loading existing data, not a save action
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
            hasData: lineItems.length > 0,
            isUserSave: true // This is a user-initiated save action
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

      // Handle HubSpot DateInput object format {year, month, date}
      if (typeof dateValue === 'object' && dateValue.year && typeof dateValue.month === 'number' && dateValue.date) {
        try {
          // Create Date object from HubSpot DateInput format (month is 0-based)
          const dateObj = new Date(dateValue.year, dateValue.month, dateValue.date);
          return isNaN(dateObj.getTime()) ? 'Invalid date' : dateObj.toLocaleDateString();
        } catch (error) {
          return 'Invalid date';
        }
      }

      // Handle pre-formatted date object
      if (typeof dateValue === 'object' && dateValue.formattedDate) {
        return dateValue.formattedDate;
      }

      // Handle string or number dates
      try {
        const dateObj = new Date(dateValue);
        return isNaN(dateObj.getTime()) ? 'Invalid date' : dateObj.toLocaleDateString();
      } catch (error) {
        return 'Invalid date';
      }
    };

    // Highlight row if it's being edited
    const isBeingEdited = isFormInEditMode && editingItemIndex === index;
    
    return (
      <TableRow key={item.id || `item-${index}`} variant={isBeingEdited ? "selected" : undefined}>
        <TableCell>{renderViewModeCell(item.id)}{isBeingEdited && " ✏️"}</TableCell>
        <TableCell>{renderViewModeCell(item.category || "DSP Display")}</TableCell>
        <TableCell>{renderViewModeCell(item.name)}</TableCell>
        <TableCell>{renderViewModeCell(formatDate(item.startDate))}</TableCell>
        <TableCell>{renderViewModeCell(formatDate(item.endDate))}</TableCell>
        <TableCell>{renderViewModeCell(item.buyingModel || "CPM")}</TableCell>
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
                variant="primary"
                size="xs"
                onClick={() => startEditingLineItem(index)}
                disabled={isFormInEditMode && editingItemIndex !== index}
              >
                ✏️ Edit
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => removeLineItem(index)}
                disabled={isFormInEditMode}
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
      <Heading>Line Items</Heading>
      <Divider />


      {/* PRODUCT CATALOG & ADD/EDIT LINE ITEM FORM - Only show in Edit Mode */}
      {isEditMode && (
        <Tile>
          {/* Form Header */}
          <Box marginTop="medium">
            <Flex justify="space-between" align="center" marginBottom="medium">
              <Text format={{ fontWeight: "bold" }}>
                {isFormInEditMode ? "Edit Line Item" : "Add New Line Item"}
              </Text>
              {isFormInEditMode && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={cancelEditLineItem}
                >
                  ✕ Cancel Edit
                </Button>
              )}
            </Flex>

            {/* Product Selection */}
            <Box marginBottom="medium">
              <Select
                label="Product *"
                options={products.map(product => {
                  if (!product.value) {
                    return product; // Keep "Select Product" option unchanged
                  }
                  
                  // Check if this product has agreement pricing override
                  let hasAgreementPricing = false;
                  let agreementPrice = null;
                  
                  if (agreementProducts && agreementProducts.length > 0) {
                    const lookupKey = `${product.category}_${product.media}_${product.contentType}_${product.buyingModel}`.toLowerCase();
                    const matchingAgreementProduct = agreementProducts.find(agreementProduct => {
                      const values = agreementProduct.values;
                      const agreementKey = `${values.name}_${values.media}_${values.content_type}_${values.buying_model}`.toLowerCase();
                      return agreementKey === lookupKey;
                    });
                    
                    if (matchingAgreementProduct) {
                      hasAgreementPricing = true;
                      agreementPrice = matchingAgreementProduct.values.pircing;
                    }
                  }
                  
                  // Create enhanced label showing pricing type
                  const priceDisplay = hasAgreementPricing 
                    ? `${agreementPrice || 0} ${currency} (Agreement Price)`
                    : `${product.price || 0} ${currency} (Default Price)`;
                  
                  return {
                    ...product,
                    label: `${product.label} - ${priceDisplay}`
                  };
                })}
                value={newLineItem.productId}
                onChange={(value) => handleNewLineItemChange("productId", value)}
                disabled={isProductsLoading || !hasProductsLoaded}
                required
              />

              {isProductsLoading && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  Loading product...
                </Text>
              )}
            </Box>

          </Box>
          
          <Divider></ Divider>

          {/* Regular Line Item Fields */}
          <Box marginTop="medium">
            <Flex direction="row" gap="medium" wrap="wrap">
              <Box flex={1} minWidth="200px">
                <Input
                  label="Line Item Name"
                  name="newItemName"
                  placeholder={isFormInEditMode ? "Enter line item name" : "Auto-filled from product selection"}
                  value={newLineItem.name}
                  onChange={(value) => handleNewLineItemChange("name", value)}
                />
                {isFormInEditMode && (
                  <Text variant="microcopy" format={{ color: 'info' }} marginTop="extra-small">
                    Editing line item #{editingItemIndex + 1}
                  </Text>
                )}
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

          <Divider></ Divider>

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
                <Input
                  label="Buying Model"
                  name="newItemBuyingModel"
                  placeholder="Enter buying model"
                  value={newLineItem.buyingModel}
                  onChange={(value) => handleNewLineItemChange("buyingModel", value)}
                />
                {newLineItem.selectedProduct && newLineItem.buyingModel ? (
                  <Text variant="microcopy" format={{ color: 'medium' }} marginTop="extra-small">
                    From selected product
                  </Text>
                ) : null}
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
                {newLineItem.hasAgreementPricing ? (
                  <Text variant="microcopy" format={{ color: 'success' }} marginTop="extra-small">
                    Agreement price applied
                  </Text>
                ) : newLineItem.selectedProduct && newLineItem.price > 0 ? (
                  <Text variant="microcopy" format={{ color: 'medium' }} marginTop="extra-small">
                    Default price applied
                  </Text>
                ) : null}
              </Box>
              <Box flex={1} minWidth="120px">
                <Input
                  label="Units"
                  name="newItemUnits"
                  placeholder="Enter units"
                  value={newLineItem.units}
                  onChange={(value) => handleNewLineItemChange("units", value)}
                />
                {newLineItem.selectedProduct && newLineItem.units ? (
                  <Text variant="microcopy" format={{ color: 'medium' }} marginTop="extra-small">
                    From selected product
                  </Text>
                ) : null}
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

          <Divider></ Divider>

          <Box marginTop="medium">
            <Flex gap="medium" align="center">
              <Button
                onClick={isFormInEditMode ? updateLineItem : addLineItem}
                variant="primary"
                disabled={!newLineItem.productId || newLineItem.price <= 0}
              >
                {isFormInEditMode ? "Update Line Item" : "Add Line Item"}
              </Button>
              {isFormInEditMode && (
                <Button
                  onClick={cancelEditLineItem}
                  variant="secondary"
                >
                  Cancel
                </Button>
              )}
            </Flex>
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
                <TableHeader>Start Date</TableHeader>
                <TableHeader>End Date</TableHeader>
                <TableHeader>Buying Model</TableHeader>
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