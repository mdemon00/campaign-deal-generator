// src/app/extensions/components/CampaignDetails.jsx

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Input,
  Select,
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text,
  Button,
  Alert,
  LoadingSpinner
} from "@hubspot/ui-extensions";

import {
  CAMPAIGN_TYPE_OPTIONS,
  DEAL_CS_OPTIONS,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const CampaignDetails = forwardRef(({
  formData,
  onChange,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false
}, ref) => {
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  const [dealCS, setDealCS] = useState(DEAL_CS_OPTIONS);
  const [isDealCSLoading, setIsDealCSLoading] = useState(false);
  const [hasDealCSLoaded, setHasDealCSLoaded] = useState(false);
  const [dealCSErrorMessage, setDealCSErrorMessage] = useState("");

  const [displayLabels, setDisplayLabels] = useState({
    campaignType: "",
    dealCS: ""
  });

  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadCampaignDetails();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  useEffect(() => {
    if (context?.crm?.objectId && runServerless && !isEditMode) {
      loadCampaignDetailsForViewMode();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  useEffect(() => {
    if (runServerless && isEditMode && !hasDealCSLoaded) {
      loadDefaultDealCS();
    }
  }, [runServerless, isEditMode, hasDealCSLoaded]);

  useEffect(() => {
    if (isEditMode) {
      updateDisplayLabels();
    }
  }, [formData, dealCS, isEditMode]);

  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const keys = ['campaignType', 'taxId', 'businessName', 'dealCS'];
      const hasChanges = keys.some(key => formData[key] !== initialFormData[key]);

      setHasUnsavedChanges(hasChanges);
      setSaveState(hasChanges ? COMPONENT_SAVE_STATES.MODIFIED : COMPONENT_SAVE_STATES.SAVED);
    }
  }, [formData, initialFormData, saveState, isEditMode]);

  const updateDisplayLabels = () => {
    const newLabels = { ...displayLabels };

    if (!displayLabels.campaignType || isEditMode) {
      const selected = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === formData.campaignType);
      if (selected) newLabels.campaignType = selected.label;
    }

    if (!displayLabels.dealCS || isEditMode) {
      const selected = dealCS.find(cs => cs.value === formData.dealCS);
      if (selected) newLabels.dealCS = selected.label;
    }

    setDisplayLabels(newLabels);
  };

  const loadCampaignDetailsForViewMode = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    try {
      const res = await runServerless({
        name: "loadCampaignDetails",
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (res?.status === "SUCCESS" && res?.response?.data) {
        const data = res.response.data;
        const keys = ['campaignType', 'taxId', 'businessName', 'dealCS'];

        keys.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        const newLabels = {};
        const selectedType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === data.formData.campaignType);
        newLabels.campaignType = selectedType?.label || data.formData.campaignType || "";

        if (data.associations?.dealCS) {
          newLabels.dealCS = data.associations.dealCS.label;
        } else {
          newLabels.dealCS = data.formData.dealCS ? `CS Representative (${data.formData.dealCS})` : "";
        }

        setDisplayLabels(newLabels);
      }
    } catch (err) {
      console.warn("View mode load failed", err);
    }
  };

  const loadCampaignDetails = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const res = await runServerless({
        name: "loadCampaignDetails",
        parameters: { campaignDealId: context.crm.objectId }
      });

      if (res?.status === "SUCCESS" && res?.response?.data) {
        const data = res.response.data;
        const keys = ['campaignType', 'taxId', 'businessName', 'dealCS'];

        keys.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        const newLabels = { ...displayLabels };
        const selectedType = CAMPAIGN_TYPE_OPTIONS.find(t => t.value === data.formData.campaignType);
        newLabels.campaignType = selectedType?.label || data.formData.campaignType || "";

        if (data.associations?.dealCS) {
          newLabels.dealCS = data.associations.dealCS.label;
        }

        setDisplayLabels(newLabels);
        setInitialFormData(data.formData);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.campaignType || data.formData.taxId || data.formData.businessName || data.formData.dealCS)
          });
        }
      } else {
        throw new Error(res?.response?.message || "Load failed");
      }
    } catch (err) {
      setSaveError(`Failed to load: ${err.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveCampaignDetails = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const res = await runServerless({
        name: "saveCampaignDetails",
        parameters: {
          campaignDealId: context.crm.objectId,
          campaignType: formData.campaignType,
          taxId: formData.taxId,
          businessName: formData.businessName,
          dealCS: formData.dealCS,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (res?.status === "SUCCESS" && res?.response?.data) {
        setInitialFormData({ ...formData });
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: 'Saved',
            lastSaved: res.response.data.savedAt,
            hasData: true
          });
        }
      } else {
        throw new Error(res?.response?.message || "Save failed");
      }
    } catch (err) {
      setSaveError(`Failed to save: ${err.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const loadDefaultDealCS = async () => {
    if (!runServerless || !isEditMode) return;

    setIsDealCSLoading(true);
    setDealCSErrorMessage("");

    try {
      const res = await runServerless({
        name: "searchDealOwners",
        parameters: { loadAll: false, limit: 20, includeInactive: false }
      });

      if (res?.status === "SUCCESS" && res.response?.data) {
        const options = res.response.data.options.map(option => ({
          ...option,
          label: option.label === "Select Deal Owner" ? "Select CS Representative" : option.label
        }));
        setDealCS(options);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      setDealCSErrorMessage(`Error: ${err.message}`);
      setDealCS(DEAL_CS_OPTIONS);
    } finally {
      setIsDealCSLoading(false);
      setHasDealCSLoaded(true);
    }
  };

  const handleFieldChange = (field, value) => {
    if (!isEditMode) return;
    onChange(field, value);
  };

  const getSaveStatusDisplay = () => {
    const message = SAVE_STATUS_MESSAGES[saveState] || SAVE_STATUS_MESSAGES[COMPONENT_SAVE_STATES.NOT_SAVED];
    const color = SAVE_STATUS_COLORS[saveState] || SAVE_STATUS_COLORS[COMPONENT_SAVE_STATES.NOT_SAVED];
    return {
      message: (saveState === COMPONENT_SAVE_STATES.SAVED && lastSaved) ? `${message} on ${lastSaved}` : message,
      color
    };
  };

  const shouldShowSaveButton = () =>
    isEditMode && (
      saveState === COMPONENT_SAVE_STATES.NOT_SAVED ||
      saveState === COMPONENT_SAVE_STATES.MODIFIED ||
      saveState === COMPONENT_SAVE_STATES.ERROR
    );

  const isSaveDisabled = () =>
    saveState === COMPONENT_SAVE_STATES.SAVING ||
    saveState === COMPONENT_SAVE_STATES.LOADING ||
    !formData.campaignType ||
    !formData.taxId ||
    !formData.businessName ||
    !formData.dealCS;

  const statusDisplay = getSaveStatusDisplay();

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Validate required fields
      if (!formData.campaignType || !formData.taxId || !formData.businessName || !formData.dealCS) {
        return "Please fill all required fields in Campaign Details.";
      }
      await saveCampaignDetails();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Campaign Details.";
      return null;
    }
  }));

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Campaign Details</Heading>
        {isEditMode ? (
          <Flex align="center" gap="small">
            <Text variant="microcopy" format={{ color: statusDisplay.color }}>
              {statusDisplay.message}
            </Text>
            {(saveState === COMPONENT_SAVE_STATES.SAVING || saveState === COMPONENT_SAVE_STATES.LOADING) && (
              <LoadingSpinner size="xs" />
            )}
          </Flex>
        ) : (
          <Text variant="microcopy" format={{ color: 'medium' }}>
            👁️ View Mode - Read Only
          </Text>
        )}
      </Flex>

      <Divider />

      {isEditMode && saveError && (
        <Box marginTop="small" marginBottom="medium">
          <Alert variant="error">{saveError}</Alert>
        </Box>
      )}

      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          <Box flex={1} minWidth="250px">
            {!isEditMode ? (
              <Input
                label="Campaign Type *"
                name="campaignType"
                placeholder="No campaign type selected"
                value={
                  displayLabels.campaignType ||
                  (formData.campaignType ? `Campaign Type (${formData.campaignType})` : "")
                }
                readOnly
              />
            ) : (
              <Select
                label="Campaign Type *"
                name="campaignType"
                options={CAMPAIGN_TYPE_OPTIONS}
                value={formData.campaignType}
                onChange={(value) => handleFieldChange("campaignType", value)}
                required
              />
            )}
          </Box>

          <Box flex={1} minWidth="250px">
            <Input
              label="Tax ID *"
              name="taxId"
              placeholder={isEditMode ? "Enter or create new Tax ID" : "No tax ID"}
              value={formData.taxId}
              onChange={isEditMode ? (value) => handleFieldChange("taxId", value) : undefined}
              readOnly={!isEditMode}
              required={isEditMode}
            />
          </Box>
        </Flex>

        <Divider />

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            <Box flex={1} minWidth="250px">
              <Input
                label="Business Name *"
                name="businessName"
                placeholder={isEditMode ? "Enter business name" : "No business name"}
                value={formData.businessName}
                onChange={isEditMode ? (value) => handleFieldChange("businessName", value) : undefined}
                readOnly={!isEditMode}
                required={isEditMode}
              />
            </Box>

            <Box flex={1} minWidth="250px">
              {!isEditMode ? (
                <Input
                  label="Deal CS *"
                  name="dealCS"
                  placeholder="No CS representative selected"
                  value={
                    displayLabels.dealCS ||
                    (formData.dealCS ? `CS Rep (${formData.dealCS})` : "")
                  }
                  readOnly
                />
              ) : (
                <Select
                  label="Deal CS *"
                  name="dealCS"
                  options={dealCS}
                  value={formData.dealCS}
                  onChange={(value) => handleFieldChange("dealCS", value)}
                  required
                  disabled={isDealCSLoading}
                />
              )}

              {isEditMode && dealCSErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {dealCSErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={loadDefaultDealCS}
                      disabled={isDealCSLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
});

export default CampaignDetails;
