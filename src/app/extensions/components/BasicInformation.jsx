// src/app/extensions/components/BasicInformation.jsx
// Complete Fixed Version - Resolves View Mode ID Display Issues

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
  COMMERCIAL_AGREEMENTS,
  DEAL_OWNER_OPTIONS,
  COMPONENT_SAVE_STATES,
  SAVE_STATUS,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const BasicInformation = forwardRef(({
  formData,
  onChange,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false
}, ref) => {

  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  // === COMMERCIAL AGREEMENTS STATE ===
  const [agreements, setAgreements] = useState(COMMERCIAL_AGREEMENTS);
  const [agreementSearchTerm, setAgreementSearchTerm] = useState("");
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [isAgreementSearching, setIsAgreementSearching] = useState(false);
  const [agreementErrorMessage, setAgreementErrorMessage] = useState("");
  const [useAgreementSearchMode, setUseAgreementSearchMode] = useState(false);
  const [agreementHasMore, setAgreementHasMore] = useState(false);
  const [lastAgreementSearchTerm, setLastAgreementSearchTerm] = useState("");
  const [companyStatus, setCompanyStatus] = useState("");

  // === ADVERTISERS STATE ===
  const [advertisers, setAdvertisers] = useState([{ label: "Select Advertiser", value: "" }]);
  const [advertiserSearchTerm, setAdvertiserSearchTerm] = useState("");
  const [isAdvertiserLoading, setIsAdvertiserLoading] = useState(false);
  const [isAdvertiserSearching, setIsAdvertiserSearching] = useState(false);
  const [hasAdvertiserLoaded, setHasAdvertiserLoaded] = useState(false);
  const [advertiserErrorMessage, setAdvertiserErrorMessage] = useState("");
  const [useAdvertiserSearchMode, setUseAdvertiserSearchMode] = useState(false);
  const [advertiserHasMore, setAdvertiserHasMore] = useState(false);
  const [lastAdvertiserSearchTerm, setLastAdvertiserSearchTerm] = useState("");

  // === DEAL OWNERS STATE ===
  const [dealOwners, setDealOwners] = useState(DEAL_OWNER_OPTIONS);
  const [dealOwnerSearchTerm, setDealOwnerSearchTerm] = useState("");
  const [isDealOwnerLoading, setIsDealOwnerLoading] = useState(false);
  const [isDealOwnerSearching, setIsDealOwnerSearching] = useState(false);
  const [hasDealOwnerLoaded, setHasDealOwnerLoaded] = useState(false);
  const [dealOwnerErrorMessage, setDealOwnerErrorMessage] = useState("");
  const [useDealOwnerSearchMode, setUseDealOwnerSearchMode] = useState(false);
  const [dealOwnerHasMore, setDealOwnerHasMore] = useState(false);
  const [lastDealOwnerSearchTerm, setLastDealOwnerSearchTerm] = useState("");

  // === VIEW MODE DISPLAY LABELS ===
  const [displayLabels, setDisplayLabels] = useState({
    commercialAgreement: "",
    advertiser: "",
    dealOwner: ""
  });

  // === COMPONENT INITIALIZATION ===

  // Load saved data on component mount (only in edit mode)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadBasicInformation();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load data for view mode - but quietly
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && !isEditMode) {
      loadBasicInformationForViewMode();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load default data for all search components (only in edit mode)
  useEffect(() => {
    if (runServerless && isEditMode) {
      loadDefaultAgreements(formData.commercialAgreement);
      if (!hasAdvertiserLoaded) {
        loadDefaultAdvertisers();
      }
      if (!hasDealOwnerLoaded) {
        loadDefaultDealOwners();
      }
    }
  }, [runServerless, isEditMode, formData.commercialAgreement, hasAdvertiserLoaded, hasDealOwnerLoaded]);

  // 🔧 FIXED: Only update display labels in edit mode when arrays are populated
  useEffect(() => {
    if (isEditMode) {
      updateDisplayLabels();
    }
  }, [formData, agreements, advertisers, dealOwners, isEditMode]);

  // Track form changes (only in edit mode)
  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const hasChanges = Object.keys(initialFormData).some(key =>
        formData[key] !== initialFormData[key]
      );

      if (hasChanges && !hasUnsavedChanges) {
        setHasUnsavedChanges(true);
        setSaveState(COMPONENT_SAVE_STATES.MODIFIED);
      } else if (!hasChanges && hasUnsavedChanges) {
        setHasUnsavedChanges(false);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
      }
    }
  }, [formData, initialFormData, saveState, hasUnsavedChanges, isEditMode]);

  // === DISPLAY LABEL FUNCTIONS ===
  const updateDisplayLabels = () => {
    const newLabels = { ...displayLabels };

    // 🔧 FIXED: Don't overwrite existing labels in view mode
    // Only update labels when in edit mode and arrays are populated

    // Commercial Agreement
    if (!displayLabels.commercialAgreement || isEditMode) {
      const selectedAgreement = agreements.find(a => a.value === formData.commercialAgreement);
      if (selectedAgreement) {
        newLabels.commercialAgreement = selectedAgreement.label;
      }
    }

    // Advertiser
    if (!displayLabels.advertiser || isEditMode) {
      const selectedAdvertiser = advertisers.find(a => a.value === formData.advertiser);
      if (selectedAdvertiser) {
        newLabels.advertiser = selectedAdvertiser.label;
      }
    }

    // Deal Owner
    if (!displayLabels.dealOwner || isEditMode) {
      const selectedDealOwner = dealOwners.find(o => o.value === formData.dealOwner);
      if (selectedDealOwner) {
        newLabels.dealOwner = selectedDealOwner.label;
      }
    }

    setDisplayLabels(newLabels);
  };

  // === 🔧 FIXED: Enhanced View Mode Loading ===
  const loadBasicInformationForViewMode = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    try {
      const response = await runServerless({
        name: "loadBasicInformation",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data (quietly, no state changes for save tracking)
        Object.keys(data.formData).forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // 🔧 FIXED: Set display labels directly from association data with proper fallbacks
        const newDisplayLabels = {};
        
        // Commercial Agreement
        if (data.associations?.commercialAgreement) {
          newDisplayLabels.commercialAgreement = data.associations.commercialAgreement.label;
        } else if (data.formData.commercialAgreement) {
          // Try to fetch the specific agreement as fallback
          try {
            const agreementResponse = await runServerless({
              name: "searchCommercialAgreements",
              parameters: {
                selectedAgreementId: data.formData.commercialAgreement,
                limit: 1
              }
            });
            
            if (agreementResponse?.status === "SUCCESS" && agreementResponse?.response?.data) {
              const foundAgreement = agreementResponse.response.data.options?.find(
                opt => opt.value === data.formData.commercialAgreement
              );
              if (foundAgreement) {
                newDisplayLabels.commercialAgreement = foundAgreement.label;
              } else {
                newDisplayLabels.commercialAgreement = `Agreement (${data.formData.commercialAgreement})`;
              }
            } else {
              newDisplayLabels.commercialAgreement = `Agreement (${data.formData.commercialAgreement})`;
            }
          } catch (error) {
            console.warn("Could not fetch agreement label:", error);
            newDisplayLabels.commercialAgreement = `Agreement (${data.formData.commercialAgreement})`;
          }
        } else {
          newDisplayLabels.commercialAgreement = "";
        }
        
        // Advertiser
        if (data.associations?.advertiser) {
          newDisplayLabels.advertiser = data.associations.advertiser.label;
        } else if (data.formData.advertiser) {
          try {
            const advertiserResponse = await runServerless({
              name: "searchAdvertisers",
              parameters: {
                searchTerm: "",
                limit: 100 // Load enough to potentially find it
              }
            });
            
            if (advertiserResponse?.status === "SUCCESS" && advertiserResponse?.response?.data) {
              const foundAdvertiser = advertiserResponse.response.data.options?.find(
                opt => opt.value === data.formData.advertiser
              );
              if (foundAdvertiser) {
                newDisplayLabels.advertiser = foundAdvertiser.label;
              } else {
                newDisplayLabels.advertiser = `Advertiser (${data.formData.advertiser})`;
              }
            } else {
              newDisplayLabels.advertiser = `Advertiser (${data.formData.advertiser})`;
            }
          } catch (error) {
            console.warn("Could not fetch advertiser label:", error);
            newDisplayLabels.advertiser = `Advertiser (${data.formData.advertiser})`;
          }
        } else {
          newDisplayLabels.advertiser = "";
        }
        
        // Deal Owner
        if (data.associations?.dealOwner) {
          newDisplayLabels.dealOwner = data.associations.dealOwner.label;
        } else if (data.formData.dealOwner) {
          try {
            const ownerResponse = await runServerless({
              name: "searchDealOwners",
              parameters: {
                searchTerm: "",
                limit: 100
              }
            });
            
            if (ownerResponse?.status === "SUCCESS" && ownerResponse?.response?.data) {
              const foundOwner = ownerResponse.response.data.options?.find(
                opt => opt.value === data.formData.dealOwner
              );
              if (foundOwner) {
                newDisplayLabels.dealOwner = foundOwner.label;
              } else {
                newDisplayLabels.dealOwner = `Owner (${data.formData.dealOwner})`;
              }
            } else {
              newDisplayLabels.dealOwner = `Owner (${data.formData.dealOwner})`;
            }
          } catch (error) {
            console.warn("Could not fetch deal owner label:", error);
            newDisplayLabels.dealOwner = `Owner (${data.formData.dealOwner})`;
          }
        } else {
          newDisplayLabels.dealOwner = "";
        }
        
        // 🔧 CRITICAL: Set display labels directly, bypassing updateDisplayLabels
        setDisplayLabels(newDisplayLabels);

        console.log("✅ Basic information loaded for view mode with enhanced display labels:", newDisplayLabels);
      }
    } catch (error) {
      console.warn("Could not load basic information for view mode:", error);
    }
  };

  // === SAVE/LOAD FUNCTIONS ===
  const loadBasicInformation = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "loadBasicInformation",
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data
        Object.keys(data.formData).forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Update display labels from association data
        const newDisplayLabels = { ...displayLabels };
        
        if (data.associations?.commercialAgreement) {
          newDisplayLabels.commercialAgreement = data.associations.commercialAgreement.label;
          setAgreementSearchTerm(data.associations.commercialAgreement.label);
        }
        
        if (data.associations?.advertiser) {
          newDisplayLabels.advertiser = data.associations.advertiser.label;
          setAdvertiserSearchTerm(data.associations.advertiser.label);
        }
        
        if (data.associations?.dealOwner) {
          newDisplayLabels.dealOwner = data.associations.dealOwner.label;
          setDealOwnerSearchTerm(data.associations.dealOwner.label);
        }
        
        setDisplayLabels(newDisplayLabels);

        // Store initial form data for change tracking
        setInitialFormData(data.formData);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.campaignName || data.formData.commercialAgreement)
          });
        }

        console.log("✅ Basic information loaded successfully with display labels:", newDisplayLabels);
      } else {
        throw new Error(response?.response?.message || "Failed to load data");
      }
    } catch (error) {
      console.error("❌ Error loading basic information:", error);
      setSaveError(`Failed to load: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveBasicInformation = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "saveBasicInformation",
        parameters: {
          campaignDealId: context.crm.objectId,
          campaignName: formData.campaignName,
          commercialAgreement: formData.commercialAgreement,
          advertiser: formData.advertiser,
          dealOwner: formData.dealOwner,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update company/currency from response
        if (data.companyInfo) {
          onChange('company', data.companyInfo.companyName);
          onChange('currency', data.companyInfo.currency);
        }

        // Update tracking state
        setInitialFormData({ ...formData });
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: 'Saved',
            lastSaved: data.savedAt,
            hasData: true
          });
        }

        console.log("✅ Basic information saved successfully");
      } else {
        throw new Error(response?.response?.message || "Failed to save data");
      }
    } catch (error) {
      console.error("❌ Error saving basic information:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  // === COMMERCIAL AGREEMENTS SEARCH FUNCTIONS ===
  const performAgreementSearch = async () => {
    if (!runServerless || !isEditMode || !agreementSearchTerm.trim()) return;

    setIsAgreementSearching(true);
    setAgreementErrorMessage("");

    try {
      const searchTerm = agreementSearchTerm.trim();
      
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
        setUseAgreementSearchMode(true);
        setLastAgreementSearchTerm(searchTerm);
        
        console.log(`✅ Agreement search completed: ${data.totalCount} results for "${searchTerm}"`);
      } else {
        throw new Error("Invalid search response");
      }
    } catch (error) {
      console.error("Agreement search error:", error);
      setAgreementErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsAgreementSearching(false);
    }
  };

  const loadDefaultAgreements = async (initialSelectedAgreementId = "") => {
    if (!runServerless || !isEditMode) return;

    setIsAgreementLoading(true);
    setAgreementErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          loadAll: false,
          limit: 20,
          selectedAgreementId: initialSelectedAgreementId
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error loading agreements:", error);
      setAgreementErrorMessage(`Error: ${error.message}`);
      setAgreements(COMMERCIAL_AGREEMENTS);
    } finally {
      setIsAgreementLoading(false);
    }
  };

  // === ADVERTISERS SEARCH FUNCTIONS ===
  const performAdvertiserSearch = async () => {
    if (!runServerless || !isEditMode || !advertiserSearchTerm.trim()) return;

    setIsAdvertiserSearching(true);
    setAdvertiserErrorMessage("");

    try {
      const searchTerm = advertiserSearchTerm.trim();
      
      const response = await runServerless({
        name: "searchAdvertisers",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAdvertisers(data.options || [{ label: "Select Advertiser", value: "" }]);
        setAdvertiserHasMore(data.hasMore || false);
        setUseAdvertiserSearchMode(true);
        setLastAdvertiserSearchTerm(searchTerm);
        
        console.log(`✅ Advertiser search completed: ${data.totalCount} results for "${searchTerm}"`);
      } else {
        throw new Error("Invalid advertiser search response");
      }
    } catch (error) {
      console.error("Advertiser search error:", error);
      setAdvertiserErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsAdvertiserSearching(false);
    }
  };

  const loadDefaultAdvertisers = async () => {
    if (!runServerless || !isEditMode) return;

    setIsAdvertiserLoading(true);
    setAdvertiserErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchAdvertisers",
        parameters: {
          loadAll: false,
          limit: 20
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAdvertisers(data.options || [{ label: "Select Advertiser", value: "" }]);
        setAdvertiserHasMore(data.hasMore || false);
      } else {
        throw new Error("Invalid response from advertiser server");
      }
    } catch (error) {
      console.error("Error loading advertisers:", error);
      setAdvertiserErrorMessage(`Error: ${error.message}`);
      setAdvertisers([
        { label: "Select Advertiser", value: "" },
        { label: "Lancome", value: "lancome" },
        { label: "L'Oreal", value: "loreal" },
      ]);
    } finally {
      setIsAdvertiserLoading(false);
      setHasAdvertiserLoaded(true);
    }
  };

  // === DEAL OWNERS SEARCH FUNCTIONS ===
  const performDealOwnerSearch = async () => {
    if (!runServerless || !isEditMode || !dealOwnerSearchTerm.trim()) return;

    setIsDealOwnerSearching(true);
    setDealOwnerErrorMessage("");

    try {
      const searchTerm = dealOwnerSearchTerm.trim();
      
      const response = await runServerless({
        name: "searchDealOwners",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setDealOwners(data.options || DEAL_OWNER_OPTIONS);
        setDealOwnerHasMore(data.hasMore || false);
        setUseDealOwnerSearchMode(true);
        setLastDealOwnerSearchTerm(searchTerm);
        
        console.log(`✅ Deal owner search completed: ${data.totalCount} results for "${searchTerm}"`);
      } else {
        throw new Error("Invalid deal owner search response");
      }
    } catch (error) {
      console.error("Deal owner search error:", error);
      setDealOwnerErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsDealOwnerSearching(false);
    }
  };

  const loadDefaultDealOwners = async () => {
    if (!runServerless || !isEditMode) return;

    setIsDealOwnerLoading(true);
    setDealOwnerErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchDealOwners",
        parameters: {
          loadAll: false,
          limit: 20,
          includeInactive: false
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setDealOwners(data.options || DEAL_OWNER_OPTIONS);
        setDealOwnerHasMore(data.hasMore || false);
        console.log(`✅ Loaded ${data.totalCount} default deal owners`);
      } else {
        throw new Error("Invalid response from deal owner server");
      }
    } catch (error) {
      console.error("Error loading deal owners:", error);
      setDealOwnerErrorMessage(`Error: ${error.message}`);
      setDealOwners(DEAL_OWNER_OPTIONS);
    } finally {
      setIsDealOwnerLoading(false);
      setHasDealOwnerLoaded(true);
    }
  };

  // === EVENT HANDLERS ===
  const handleCommercialAgreementChange = (value) => {
    if (!isEditMode) return;

    const selectedAgreement = agreements.find(agreement => agreement.value === value);

    onChange('commercialAgreement', value);

    if (selectedAgreement && selectedAgreement.value !== "") {
      setAgreementSearchTerm(selectedAgreement.label);
      setUseAgreementSearchMode(false);

      if (selectedAgreement.hasCompany === false) {
        onChange('company', 'No company found');
        onChange('currency', '');
      } else if (selectedAgreement.company && selectedAgreement.company !== 'No company found') {
        onChange('company', selectedAgreement.company);
        onChange('currency', selectedAgreement.currency || '');
      } else {
        onChange('company', 'Loading company...');
        setCompanyStatus("🔄 Fetching company information...");
        onChange('currency', '');
      }
    } else {
      onChange('company', '');
      onChange('currency', '');
      setCompanyStatus("");
    }
  };

  const handleAdvertiserChange = (value) => {
    if (!isEditMode) return;

    const selectedAdvertiser = advertisers.find(advertiser => advertiser.value === value);

    onChange('advertiser', value);

    if (selectedAdvertiser && selectedAdvertiser.value !== "" && selectedAdvertiser.value !== "new") {
      setAdvertiserSearchTerm(selectedAdvertiser.label);
      setUseAdvertiserSearchMode(false);
    }
  };

  const handleDealOwnerChange = (value) => {
    if (!isEditMode) return;

    const selectedDealOwner = dealOwners.find(owner => owner.value === value);

    onChange('dealOwner', value);

    if (selectedDealOwner && selectedDealOwner.value !== "") {
      setDealOwnerSearchTerm(selectedDealOwner.label);
      setUseDealOwnerSearchMode(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (!isEditMode) return;

    if (field === 'commercialAgreement') {
      handleCommercialAgreementChange(value);
    } else if (field === 'advertiser') {
      handleAdvertiserChange(value);
    } else if (field === 'dealOwner') {
      handleDealOwnerChange(value);
    } else {
      onChange(field, value);
    }
  };

  // === CLEAR SEARCH FUNCTIONS ===
  const clearAgreementSearch = () => {
    if (!isEditMode) return;
    setAgreementSearchTerm("");
    setUseAgreementSearchMode(false);
    setAgreementErrorMessage("");
    setLastAgreementSearchTerm("");
    loadDefaultAgreements(formData.commercialAgreement);
  };

  const clearAdvertiserSearch = () => {
    if (!isEditMode) return;
    setAdvertiserSearchTerm("");
    setUseAdvertiserSearchMode(false);
    setAdvertiserErrorMessage("");
    setLastAdvertiserSearchTerm("");
    loadDefaultAdvertisers();
  };

  const clearDealOwnerSearch = () => {
    if (!isEditMode) return;
    setDealOwnerSearchTerm("");
    setUseDealOwnerSearchMode(false);
    setDealOwnerErrorMessage("");
    setLastDealOwnerSearchTerm("");
    loadDefaultDealOwners();
  };

  // === MODE CONTROL FUNCTIONS ===
  const switchAgreementToBrowseMode = () => {
    if (!isEditMode) return;
    setUseAgreementSearchMode(false);
    setAgreementSearchTerm("");
    setLastAgreementSearchTerm("");
    loadDefaultAgreements(formData.commercialAgreement);
  };

  const switchAgreementToSearchMode = () => {
    if (!isEditMode) return;
    setUseAgreementSearchMode(true);
    setAgreementSearchTerm("");
    setLastAgreementSearchTerm("");
  };

  const switchAdvertiserToBrowseMode = () => {
    if (!isEditMode) return;
    setUseAdvertiserSearchMode(false);
    setAdvertiserSearchTerm("");
    setLastAdvertiserSearchTerm("");
    loadDefaultAdvertisers();
  };

  const switchAdvertiserToSearchMode = () => {
    if (!isEditMode) return;
    setUseAdvertiserSearchMode(true);
    setAdvertiserSearchTerm("");
    setLastAdvertiserSearchTerm("");
  };

  const switchDealOwnerToBrowseMode = () => {
    if (!isEditMode) return;
    setUseDealOwnerSearchMode(false);
    setDealOwnerSearchTerm("");
    setLastDealOwnerSearchTerm("");
    loadDefaultDealOwners();
  };

  const switchDealOwnerToSearchMode = () => {
    if (!isEditMode) return;
    setUseDealOwnerSearchMode(true);
    setDealOwnerSearchTerm("");
    setLastDealOwnerSearchTerm("");
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
           !formData.campaignName ||
           !formData.commercialAgreement ||
           !formData.advertiser ||
           !formData.dealOwner;
  };

  // === STATUS MESSAGES ===
  const getAgreementStatusMessage = () => {
    if (!isEditMode) return "";
    if (isAgreementSearching) return "Searching agreements...";
    if (isAgreementLoading) return "Loading agreements...";
    if (useAgreementSearchMode && lastAgreementSearchTerm) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} results for "${lastAgreementSearchTerm}"`;
    }
    if (agreements.length > 1) {
      const count = agreements.length - 1;
      return `${count} agreements available${agreementHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getAdvertiserStatusMessage = () => {
    if (!isEditMode) return "";
    if (isAdvertiserSearching) return "Searching advertisers...";
    if (isAdvertiserLoading) return "Loading advertisers...";
    if (useAdvertiserSearchMode && lastAdvertiserSearchTerm) {
      const count = advertisers.length > 1 ? advertisers.length - 1 : 0;
      return `${count} results for "${lastAdvertiserSearchTerm}"`;
    }
    if (advertisers.length > 1) {
      const count = advertisers.length - 1;
      return `${count} advertisers available${advertiserHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getDealOwnerStatusMessage = () => {
    if (!isEditMode) return "";
    if (isDealOwnerSearching) return "Searching deal owners...";
    if (isDealOwnerLoading) return "Loading deal owners...";
    if (useDealOwnerSearchMode && lastDealOwnerSearchTerm) {
      const count = dealOwners.length > 1 ? dealOwners.length - 1 : 0;
      return `${count} results for "${lastDealOwnerSearchTerm}"`;
    }
    if (dealOwners.length > 1) {
      const count = dealOwners.length - 1;
      return `${count} deal owners available${dealOwnerHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const statusDisplay = getSaveStatusDisplay();

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Validate required fields
      if (!formData.campaignName || !formData.commercialAgreement || !formData.advertiser || !formData.dealOwner) {
        return "Please fill all required fields in Basic Information.";
      }
      await saveBasicInformation();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Basic Information.";
      return null;
    }
  }));

  return (
    <Tile>
      <Flex justify="space-between" align="center">
        <Heading>Basic Information</Heading>

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

      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          {/* CAMPAIGN NAME - VIEW/EDIT MODE */}
          <Box flex={1} minWidth="250px">
            <Input
              label="Campaign Name *"
              name="campaignName"
              placeholder={isEditMode ? "Enter campaign name" : "No campaign name"}
              value={formData.campaignName}
              onChange={isEditMode ? (value) => handleFieldChange("campaignName", value) : undefined}
              readOnly={!isEditMode}
              required={isEditMode}
            />
          </Box>

          {/* COMMERCIAL AGREEMENTS - VIEW/EDIT MODE */}
          <Box flex={1} minWidth="250px">
            {/* Mode Controls - Only show in Edit Mode */}
            {isEditMode && (
              <Flex gap="small" marginBottom="small" wrap="wrap">
                <Button
                  variant={!useAgreementSearchMode ? "primary" : "secondary"}
                  size="xs"
                  onClick={switchAgreementToBrowseMode}
                  disabled={isAgreementLoading}
                >
                  📋 Browse
                </Button>
                <Button
                  variant={useAgreementSearchMode ? "primary" : "secondary"}
                  size="xs"
                  onClick={switchAgreementToSearchMode}
                  disabled={isAgreementLoading}
                >
                  🔍 Search
                </Button>
                {useAgreementSearchMode && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={clearAgreementSearch}
                  >
                    ✕ Clear
                  </Button>
                )}
              </Flex>
            )}

            {/* View Mode: Simple Input Display */}
            {!isEditMode && (
              <Input
                label="Commercial Agreement *"
                name="commercialAgreement"
                placeholder="No commercial agreement selected"
                value={
                  displayLabels.commercialAgreement || 
                  (formData.commercialAgreement ? `Agreement (${formData.commercialAgreement})` : "")
                }
                readOnly={true}
              />
            )}

            {/* Edit Mode: Search or Select */}
            {isEditMode && useAgreementSearchMode ? (
              <Flex gap="small" direction="row" align="end">
                <Box flex={1}>
                  <Input
                    label="Search Commercial Agreements *"
                    name="searchAgreements"
                    placeholder="Enter agreement name..."
                    value={agreementSearchTerm}
                    onChange={(value) => setAgreementSearchTerm(value)}
                    disabled={isAgreementLoading || isAgreementSearching}
                  />
                </Box>
                <Box>
                  <Button 
                    onClick={performAgreementSearch}
                    disabled={!agreementSearchTerm.trim() || isAgreementSearching || isAgreementLoading}
                  >
                    {isAgreementSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                  </Button>
                </Box>
              </Flex>
            ) : isEditMode ? (
              <Select
                label="Commercial Agreement *"
                name="commercialAgreement"
                options={agreements}
                value={formData.commercialAgreement}
                onChange={(value) => handleFieldChange("commercialAgreement", value)}
                required
                disabled={isAgreementLoading}
              />
            ) : null}

            {/* Search Results Select - Only in Edit Mode */}
            {isEditMode && useAgreementSearchMode && lastAgreementSearchTerm && agreements.length > 1 && (
              <Box marginTop="small">
                <Select
                  label="Select from search results"
                  name="searchResults"
                  options={agreements}
                  value={formData.commercialAgreement}
                  onChange={(value) => handleFieldChange("commercialAgreement", value)}
                  disabled={isAgreementSearching}
                />
              </Box>
            )}

            {/* Status Messages - Only in Edit Mode */}
            {getAgreementStatusMessage() && (
              <Text variant="microcopy" format={{ color: 'medium' }}>
                {getAgreementStatusMessage()}
              </Text>
            )}

            {/* Error Messages - Only in Edit Mode */}
            {isEditMode && agreementErrorMessage && (
              <Box marginTop="extra-small">
                <Text variant="microcopy" format={{ color: 'error' }}>
                  {agreementErrorMessage}
                </Text>
                <Box marginTop="extra-small">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => loadDefaultAgreements(formData.commercialAgreement)}
                    disabled={isAgreementLoading}
                  >
                    Retry
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Flex>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* COMPANY - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Company"
                name="company"
                placeholder={isEditMode ? "Auto-populated from agreement" : "No company information"}
                value={formData.company}
                readOnly={true}
              />

              {companyStatus && (
                <Box marginTop="extra-small">
                  <Text
                    variant="microcopy"
                    format={{
                      color: companyStatus.includes('No company') ? 'error' :
                             companyStatus.includes('Company:') ? 'success' : 'medium'
                    }}
                  >
                    {companyStatus}
                  </Text>
                </Box>
              )}
            </Box>

            {/* ADVERTISERS - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              {/* Mode Controls - Only show in Edit Mode */}
              {isEditMode && (
                <Flex gap="small" marginBottom="small" wrap="wrap">
                  <Button
                    variant={!useAdvertiserSearchMode ? "primary" : "secondary"}
                    size="xs"
                    onClick={switchAdvertiserToBrowseMode}
                    disabled={isAdvertiserLoading}
                  >
                    📋 Browse
                  </Button>
                  <Button
                    variant={useAdvertiserSearchMode ? "primary" : "secondary"}
                    size="xs"
                    onClick={switchAdvertiserToSearchMode}
                    disabled={isAdvertiserLoading}
                  >
                    🔍 Search
                  </Button>
                  {useAdvertiserSearchMode && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearAdvertiserSearch}
                    >
                      ✕ Clear
                    </Button>
                  )}
                </Flex>
              )}

              {/* View Mode: Simple Input Display */}
              {!isEditMode && (
                <Input
                  label="Advertiser *"
                  name="advertiser"
                  placeholder="No advertiser selected"
                  value={
                    displayLabels.advertiser || 
                    (formData.advertiser ? `Advertiser (${formData.advertiser})` : "")
                  }
                  readOnly={true}
                />
              )}

              {/* Edit Mode: Search or Select */}
              {isEditMode && useAdvertiserSearchMode ? (
                <Flex gap="small" direction="row" align="end">
                  <Box flex={1}>
                    <Input
                      label="Search Advertisers *"
                      name="searchAdvertisers"
                      placeholder="Enter advertiser name..."
                      value={advertiserSearchTerm}
                      onChange={(value) => setAdvertiserSearchTerm(value)}
                      disabled={isAdvertiserLoading || isAdvertiserSearching}
                    />
                  </Box>
                  <Box>
                    <Button 
                      onClick={performAdvertiserSearch}
                      disabled={!advertiserSearchTerm.trim() || isAdvertiserSearching || isAdvertiserLoading}
                    >
                      {isAdvertiserSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                    </Button>
                  </Box>
                </Flex>
              ) : isEditMode ? (
                <Select
                  label="Advertiser *"
                  name="advertiser"
                  options={advertisers}
                  value={formData.advertiser}
                  onChange={(value) => handleFieldChange("advertiser", value)}
                  required
                  disabled={isAdvertiserLoading}
                />
              ) : null}

              {/* Search Results - Only in Edit Mode */}
              {isEditMode && useAdvertiserSearchMode && lastAdvertiserSearchTerm && advertisers.length > 1 && (
                <Box marginTop="small">
                  <Select
                    label="Select from search results"
                    name="advertiserSearchResults"
                    options={advertisers}
                    value={formData.advertiser}
                    onChange={(value) => handleFieldChange("advertiser", value)}
                    disabled={isAdvertiserSearching}
                  />
                </Box>
              )}

              {/* Status Messages - Only in Edit Mode */}
              {getAdvertiserStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getAdvertiserStatusMessage()}
                </Text>
              )}

              {/* Error Messages - Only in Edit Mode */}
              {isEditMode && advertiserErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {advertiserErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={loadDefaultAdvertisers}
                      disabled={isAdvertiserLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* DEAL OWNERS - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              {/* Mode Controls - Only show in Edit Mode */}
              {isEditMode && (
                <Flex gap="small" marginBottom="small" wrap="wrap">
                  <Button
                    variant={!useDealOwnerSearchMode ? "primary" : "secondary"}
                    size="xs"
                    onClick={switchDealOwnerToBrowseMode}
                    disabled={isDealOwnerLoading}
                  >
                    📋 Browse
                  </Button>
                  <Button
                    variant={useDealOwnerSearchMode ? "primary" : "secondary"}
                    size="xs"
                    onClick={switchDealOwnerToSearchMode}
                    disabled={isDealOwnerLoading}
                  >
                    🔍 Search
                  </Button>
                  {useDealOwnerSearchMode && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={clearDealOwnerSearch}
                    >
                      ✕ Clear
                    </Button>
                  )}
                </Flex>
              )}

              {/* View Mode: Simple Input Display */}
              {!isEditMode && (
                <Input
                  label="Deal Owner *"
                  name="dealOwner"
                  placeholder="No deal owner selected"
                  value={
                    displayLabels.dealOwner || 
                    (formData.dealOwner ? `Owner (${formData.dealOwner})` : "")
                  }
                  readOnly={true}
                />
              )}

              {/* Edit Mode: Search or Select */}
              {isEditMode && useDealOwnerSearchMode ? (
                <Flex gap="small" direction="row" align="end">
                  <Box flex={1}>
                    <Input
                      label="Search Deal Owners *"
                      name="searchDealOwners"
                      placeholder="Enter owner name..."
                      value={dealOwnerSearchTerm}
                      onChange={(value) => setDealOwnerSearchTerm(value)}
                      disabled={isDealOwnerLoading || isDealOwnerSearching}
                    />
                  </Box>
                  <Box>
                    <Button 
                      onClick={performDealOwnerSearch}
                      disabled={!dealOwnerSearchTerm.trim() || isDealOwnerSearching || isDealOwnerLoading}
                    >
                      {isDealOwnerSearching ? <LoadingSpinner size="xs" /> : "🔍"}
                    </Button>
                  </Box>
                </Flex>
              ) : isEditMode ? (
                <Select
                  label="Deal Owner *"
                  name="dealOwner"
                  options={dealOwners}
                  value={formData.dealOwner}
                  onChange={(value) => handleFieldChange("dealOwner", value)}
                  required
                  disabled={isDealOwnerLoading}
                />
              ) : null}

              {/* Search Results - Only in Edit Mode */}
              {isEditMode && useDealOwnerSearchMode && lastDealOwnerSearchTerm && dealOwners.length > 1 && (
                <Box marginTop="small">
                  <Select
                    label="Select from search results"
                    name="dealOwnerSearchResults"
                    options={dealOwners}
                    value={formData.dealOwner}
                    onChange={(value) => handleFieldChange("dealOwner", value)}
                    disabled={isDealOwnerSearching}
                  />
                </Box>
              )}

              {/* Status Messages - Only in Edit Mode */}
              {getDealOwnerStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getDealOwnerStatusMessage()}
                </Text>
              )}

              {/* Error Messages - Only in Edit Mode */}
              {isEditMode && dealOwnerErrorMessage && (
                <Box marginTop="extra-small">
                  <Text variant="microcopy" format={{ color: 'error' }}>
                    {dealOwnerErrorMessage}
                  </Text>
                  <Box marginTop="extra-small">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={loadDefaultDealOwners}
                      disabled={isDealOwnerLoading}
                    >
                      Retry
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>

            {/* CURRENCY - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Currency"
                name="currency"
                value={formData.currency}
                placeholder={
                  !isEditMode ? "No currency information" :
                  formData.company === 'No company found' ? 'No currency available' : 'Auto-populated'
                }
                readOnly={true}
              />
            </Box>
          </Flex>
        </Box>

        {/* Save Button - Only show in Edit Mode */}
        {/* REMOVED: Unified save button is now in parent */}
      </Box>
    </Tile>
  );
});

export default BasicInformation;