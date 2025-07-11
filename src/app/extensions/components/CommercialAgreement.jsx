// src/app/extensions/components/CommercialAgreement.jsx
// New Component - Moved Commercial Agreement logic from BasicInformation

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
  COMPONENT_SAVE_STATES,
  SAVE_STATUS_MESSAGES,
  SAVE_STATUS_COLORS
} from '../utils/constants.js';

const CommercialAgreement = forwardRef(({
  formData,
  onChange,
  runServerless,
  context,
  onSaveStatusChange,
  isEditMode = false,
  lineItemsRef // New prop to communicate with LineItems component
}, ref) => {

  // === SAVE/LOAD STATE ===
  const [saveState, setSaveState] = useState(COMPONENT_SAVE_STATES.NOT_SAVED);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  // === COMPANY SEARCH STATE ===
  const [companies, setCompanies] = useState([{ label: "Select Company", value: "" }]);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [isCompanySearching, setIsCompanySearching] = useState(false);
  const [companyErrorMessage, setCompanyErrorMessage] = useState("");
  const [lastCompanySearchTerm, setLastCompanySearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);

  // === COMMERCIAL AGREEMENTS STATE ===
  const [agreements, setAgreements] = useState([{ label: "Select Commercial Agreement", value: "" }]);
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [agreementErrorMessage, setAgreementErrorMessage] = useState("");

  // === VIEW MODE DISPLAY LABELS ===
  const [displayLabels, setDisplayLabels] = useState({
    company: "",
    commercialAgreement: ""
  });

  // === COMPONENT INITIALIZATION ===

  // Debug: Log formData changes
  useEffect(() => {
    console.log('🔍 [DEBUG] CommercialAgreement formData updated:', {
      company: formData.company,
      commercialAgreement: formData.commercialAgreement,
      currency: formData.currency
    });
  }, [formData]);

  // Load saved data on component mount (only in edit mode)
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && isEditMode) {
      loadCommercialAgreement();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Load data for view mode - but quietly
  useEffect(() => {
    if (context?.crm?.objectId && runServerless && !isEditMode) {
      loadCommercialAgreementForViewMode();
    }
  }, [context?.crm?.objectId, runServerless, isEditMode]);

  // Skip loading default agreements - we'll only load when user searches

  // Update display labels in edit mode when arrays are populated
  useEffect(() => {
    if (isEditMode) {
      updateDisplayLabels();
    }
  }, [formData, companies, agreements, isEditMode]);

  // Track form changes (only in edit mode)
  useEffect(() => {
    if (initialFormData && saveState === COMPONENT_SAVE_STATES.SAVED && isEditMode) {
      const commercialFields = ['commercialAgreement', 'company', 'currency'];
      const hasChanges = commercialFields.some(key =>
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

  // Load agreements when a company is selected
  useEffect(() => {
    if (isEditMode && selectedCompany && selectedCompany.value) {
      console.log('🔄 [LOAD] Loading agreements for selected company:', selectedCompany);
      fetchAgreementsByCompany(selectedCompany.value);
    } else if (isEditMode && !selectedCompany) {
      // Clear agreements when no company is selected
      setAgreements([{ label: "Select Commercial Agreement", value: "" }]);
      onChange('commercialAgreement', '');
      onChange('currency', '');
    }
  }, [selectedCompany, isEditMode]);

  // After agreements are loaded, auto-select the saved agreement
  useEffect(() => {
    if (isEditMode && agreements.length > 1 && initialFormData?.commercialAgreement) {
      const savedAgreementId = initialFormData.commercialAgreement;
      const savedAgreement = agreements.find(a => a.value === savedAgreementId);
      
      console.log('🔍 [LOAD] Auto-selection check:', {
        savedAgreementId,
        foundAgreement: !!savedAgreement,
        agreementsCount: agreements.length - 1, // -1 for "Select" option
        currentFormValue: formData.commercialAgreement
      });
      
      if (savedAgreement) {
        console.log('✅ [LOAD] Auto-selecting saved agreement:', savedAgreement.label);
        
        // Select the agreement
        onChange('commercialAgreement', savedAgreement.value);
        
        // Set currency from the saved agreement or initial data
        console.log('🔍 [LOAD] Agreement currency check:', {
          agreementId: savedAgreement.value,
          agreementLabel: savedAgreement.label,
          currency: savedAgreement.currency,
          hasCurrency: !!savedAgreement.currency,
          initialCurrency: initialFormData?.currency,
          fullAgreementData: savedAgreement
        });
        
        if (savedAgreement.currency) {
          onChange('currency', savedAgreement.currency);
          console.log('💰 [LOAD] Auto-set currency from agreement:', savedAgreement.currency);
        } else if (initialFormData?.currency) {
          // Use saved currency from initial form data if agreement doesn't have currency
          onChange('currency', initialFormData.currency);
          console.log('💰 [LOAD] Auto-set currency from saved data:', initialFormData.currency);
        } else {
          console.log('⚠️ [LOAD] No currency in agreement data, will be set later via fetchAgreementDates');
        }
        
        // Trigger the same actions as manual selection
        fetchAgreementDates(savedAgreement.value);
        
        if (lineItemsRef?.current?.loadAgreementProducts) {
          console.log('🔄 [LOAD] Auto-loading agreement products');
          lineItemsRef.current.loadAgreementProducts(savedAgreement.value);
        }
      } else {
        console.log('⚠️ [LOAD] Saved agreement not found in loaded agreements:', {
          savedAgreementId,
          availableAgreements: agreements.map(a => ({id: a.value, label: a.label}))
        });
      }
    }
  }, [agreements, initialFormData?.commercialAgreement, isEditMode]);

  // Fetch agreement dates and products when commercial agreement is initially loaded (edit mode only)
  useEffect(() => {
    if (isEditMode && formData.commercialAgreement && formData.commercialAgreement !== "" && 
        saveState === COMPONENT_SAVE_STATES.SAVED && lineItemsRef?.current) {
      console.log(`🔄 Initial load: Fetching dates and products for loaded commercial agreement: ${formData.commercialAgreement}`);
      
      // Fetch agreement dates
      if (lineItemsRef.current.updateAgreementDates) {
        fetchAgreementDates(formData.commercialAgreement);
      }
      
      // Load agreement products for pricing overrides
      if (lineItemsRef.current.loadAgreementProducts) {
        lineItemsRef.current.loadAgreementProducts(formData.commercialAgreement);
      }
    }
  }, [isEditMode, formData.commercialAgreement, saveState, lineItemsRef]);

  // === DISPLAY LABEL FUNCTIONS ===
  const updateDisplayLabels = () => {
    const newLabels = { ...displayLabels };

    // Company
    if (!displayLabels.company || isEditMode) {
      if (selectedCompany && selectedCompany.value) {
        newLabels.company = selectedCompany.companyName || selectedCompany.label;
      }
    }

    // Commercial Agreement
    if (!displayLabels.commercialAgreement || isEditMode) {
      const selectedAgreement = agreements.find(a => a.value === formData.commercialAgreement);
      if (selectedAgreement) {
        newLabels.commercialAgreement = selectedAgreement.label;
      }
    }

    setDisplayLabels(newLabels);
  };

  // === VIEW MODE LOADING ===
  const loadCommercialAgreementForViewMode = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    try {
      const response = await runServerless({
        name: "loadBasicInformation", // Reuse existing function
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data (quietly)
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        commercialFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Set display labels from association data with proper fallbacks
        const newDisplayLabels = {};
        
        // Company
        if (data.associations?.company) {
          newDisplayLabels.company = data.associations.company.label;
        } else if (data.formData.company) {
          newDisplayLabels.company = data.formData.company;
        } else {
          newDisplayLabels.company = "";
        }
        
        // Commercial Agreement
        if (data.associations?.commercialAgreement) {
          newDisplayLabels.commercialAgreement = data.associations.commercialAgreement.label;
        } else if (data.formData.commercialAgreement) {
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
        
        // Set display labels directly
        setDisplayLabels(newDisplayLabels);

        // console.log($2
      }
    } catch (error) {
      console.warn("Could not load commercial agreement for view mode:", error);
    }
  };

  // === SAVE/LOAD FUNCTIONS ===
  const loadCommercialAgreement = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.LOADING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "loadBasicInformation", // Reuse existing function
        parameters: {
          campaignDealId: context.crm.objectId
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Populate form with loaded data
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        commercialFields.forEach(key => {
          if (data.formData[key] !== formData[key]) {
            onChange(key, data.formData[key]);
          }
        });

        // Update display labels from association data and set search terms
        const newDisplayLabels = { ...displayLabels };
        
        if (data.associations?.company) {
          newDisplayLabels.company = data.associations.company.label;
          setCompanySearchTerm(data.associations.company.label);
          
          // Set selected company for agreement loading
          const companyData = {
            value: data.associations.company.id || data.formData.company,
            label: data.associations.company.label,
            companyName: data.associations.company.label
          };
          setSelectedCompany(companyData);
          
          // Add company to companies list so it appears in dropdown
          setCompanies([
            { label: "Select Company", value: "" },
            companyData
          ]);
          setLastCompanySearchTerm(data.associations.company.label);
          
          console.log('🏢 [LOAD] Set company from associations:', companyData);
        } else if (data.formData.company) {
          // Fallback: try to search for company by name to get the ID
          console.log('🔍 [LOAD] No company association, searching for company by name:', data.formData.company);
          
          // Search for the company to get its ID
          searchCompanyByName(data.formData.company);
        }
        
        if (data.associations?.commercialAgreement) {
          newDisplayLabels.commercialAgreement = data.associations.commercialAgreement.label;
        }
        
        setDisplayLabels(newDisplayLabels);

        // Store initial form data for change tracking
        const commercialFormData = {};
        commercialFields.forEach(key => {
          commercialFormData[key] = data.formData[key];
        });
        setInitialFormData(commercialFormData);
        setLastSaved(data.metadata?.lastSaved);
        setSaveState(data.saveStatus === 'Saved' ? COMPONENT_SAVE_STATES.SAVED : COMPONENT_SAVE_STATES.NOT_SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component (loading existing data, not a user save)
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: data.saveStatus,
            lastSaved: data.metadata?.lastSaved,
            hasData: !!(data.formData.company || data.formData.commercialAgreement),
            isUserSave: false // This is loading existing data, not a save action
          });
        }

        // console.log($2
      } else {
        throw new Error(response?.response?.message || "Failed to load data");
      }
    } catch (error) {
      console.error("❌ Error loading commercial agreement:", error);
      setSaveError(`Failed to load: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  const saveCommercialAgreement = async () => {
    if (!runServerless || !context?.crm?.objectId) return;

    setSaveState(COMPONENT_SAVE_STATES.SAVING);
    setSaveError("");

    try {
      const response = await runServerless({
        name: "saveBasicInformation", // Reuse existing function - will need to be updated
        parameters: {
          campaignDealId: context.crm.objectId,
          company: formData.company, // This is the display name
          companyId: selectedCompany?.value || formData.company, // This is the ID
          commercialAgreement: formData.commercialAgreement,
          currency: formData.currency,
          createdBy: `${context?.user?.firstName || ''} ${context?.user?.lastName || ''}`.trim()
        }
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;

        // Update tracking state
        const commercialFields = ['commercialAgreement', 'company', 'currency'];
        const commercialFormData = {};
        commercialFields.forEach(key => {
          commercialFormData[key] = formData[key];
        });
        setInitialFormData(commercialFormData);
        setLastSaved(new Date().toISOString().split('T')[0]);
        setSaveState(COMPONENT_SAVE_STATES.SAVED);
        setHasUnsavedChanges(false);

        // Notify parent component (user initiated save action)
        if (onSaveStatusChange) {
          onSaveStatusChange({
            status: 'Saved',
            lastSaved: data.savedAt,
            hasData: true,
            isUserSave: true // This is a user-initiated save action
          });
        }

        // console.log($2
      } else {
        throw new Error(response?.response?.message || "Failed to save data");
      }
    } catch (error) {
      console.error("❌ Error saving commercial agreement:", error);
      setSaveError(`Failed to save: ${error.message}`);
      setSaveState(COMPONENT_SAVE_STATES.ERROR);
    }
  };

  // === AGREEMENT DATES FETCH FUNCTION ===
  const fetchAgreementDates = async (agreementId) => {
    if (!runServerless || !agreementId) return;

    try {
      console.log(`📅 Fetching agreement dates for Commercial Agreement ID: ${agreementId}`);
      
      const response = await runServerless({
        name: "fetchAgreementDates",
        parameters: {
          agreementId: agreementId
        }
      });

      if (response?.status === "SUCCESS") {
        const agreementData = response.response?.data || {};
        console.log(`✅ Found agreement dates for Agreement ID ${agreementId}:`, agreementData);
        
        // Update LineItems component with agreement dates
        if (lineItemsRef?.current?.updateAgreementDates) {
          lineItemsRef.current.updateAgreementDates({
            startDate: agreementData.fecha_de_inicio,
            endDate: agreementData.fecha_de_finalizacion
          });
          console.log(`🔄 Updated LineItems with agreement dates`);
        }
        
        // Set currency from agreement data if available
        if (agreementData.moneda) {
          console.log(`💰 [LOAD] Setting currency from fetchAgreementDates: ${agreementData.moneda}`);
          onChange('currency', agreementData.moneda);
        } else {
          console.log(`⚠️ [LOAD] No moneda field in agreement dates response:`, Object.keys(agreementData));
        }
      } else {
        console.log(`❌ Failed to fetch agreement dates for Agreement ID ${agreementId}:`, response);
      }
    } catch (error) {
      console.error(`❌ Error fetching agreement dates for Agreement ID ${agreementId}:`, error);
    }
  };

  // Currency is now included directly in fetchAgreementsByCompany response - no separate API call needed

  // === COMPANY SEARCH FUNCTIONS ===
  const searchCompanyByName = async (companyName) => {
    if (!runServerless || !companyName) return;

    try {
      console.log(`🔍 [LOAD] Searching for company by name: "${companyName}"`);
      
      const response = await runServerless({
        name: "searchCompanies",
        parameters: {
          searchTerm: companyName,
          page: 1,
          limit: 10
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        const options = data.options || [];
        
        // Find exact match or best match for the company name
        const exactMatch = options.find(option => 
          option.companyName === companyName || option.label === companyName
        );
        
        const partialMatch = options.find(option => 
          option.companyName?.includes(companyName) || option.label?.includes(companyName)
        );
        
        const foundCompany = exactMatch || partialMatch;
        
        if (foundCompany && foundCompany.value) {
          console.log(`✅ [LOAD] Found company by name:`, foundCompany);
          
          setSelectedCompany(foundCompany);
          setCompanySearchTerm(foundCompany.label);
          setCompanies([
            { label: "Select Company", value: "" },
            foundCompany
          ]);
          setLastCompanySearchTerm(foundCompany.label);
        } else {
          console.log(`⚠️ [LOAD] Company not found by name: "${companyName}"`);
          // Still set the company data even if we can't find the ID
          const fallbackCompanyData = {
            value: companyName,
            label: companyName,
            companyName: companyName
          };
          setSelectedCompany(fallbackCompanyData);
          setCompanySearchTerm(companyName);
        }
      } else {
        console.log(`❌ [LOAD] Failed to search for company: "${companyName}"`);
      }
    } catch (error) {
      console.error(`❌ [LOAD] Error searching for company "${companyName}":`, error);
    }
  };

  const performCompanySearch = async () => {
    if (!runServerless || !isEditMode || !companySearchTerm.trim()) return;

    setIsCompanySearching(true);
    setCompanyErrorMessage("");

    try {
      const searchTerm = companySearchTerm.trim();
      
      const response = await runServerless({
        name: "searchCompanies",
        parameters: {
          searchTerm: searchTerm,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setCompanies(data.options || [{ label: "Select Company", value: "" }]);
        setLastCompanySearchTerm(searchTerm);
        
        console.log(`✅ Found ${data.options.length - 1} companies for "${searchTerm}"`);
      } else {
        throw new Error("Invalid search response");
      }
    } catch (error) {
      console.error("Company search error:", error);
      setCompanyErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsCompanySearching(false);
    }
  };

  // === AGREEMENTS BY COMPANY FUNCTION ===
  const fetchAgreementsByCompany = async (companyId) => {
    if (!runServerless || !companyId) {
      setAgreements([{ label: "Select Commercial Agreement", value: "" }]);
      return;
    }

    setIsAgreementLoading(true);
    setAgreementErrorMessage("");

    try {
      console.log(`🔍 Fetching agreements for company: ${companyId}`);
      
      const response = await runServerless({
        name: "fetchAgreementsByCompany",
        parameters: {
          companyId: companyId,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        
        console.log('🔍 [DEBUG] Raw agreements response:', data.options);
        
        setAgreements(data.options || [{ label: "Select Commercial Agreement", value: "" }]);
        
        console.log(`✅ Found ${data.options.length - 1} agreements for company ${companyId}`);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Fetch agreements error:", error);
      setAgreementErrorMessage(`Failed to load agreements: ${error.message}`);
      setAgreements([{ label: "Select Commercial Agreement", value: "" }]);
    } finally {
      setIsAgreementLoading(false);
    }
  };

  // Removed loadDefaultAgreements - commercial agreements are now loaded only when company is selected

  // === EVENT HANDLERS ===
  const handleCompanyChange = (value) => {
    if (!isEditMode) return;

    const company = companies.find(c => c.value === value);
    
    if (company && company.value !== "") {
      setSelectedCompany(company);
      setCompanySearchTerm(company.label);
      onChange('company', company.companyName || company.label);
      
      console.log(`🏢 Company selected: ${company.companyName || company.label}`);
      
      // Clear previous agreement selection
      onChange('commercialAgreement', '');
      onChange('currency', '');
      
      // Clear agreement-related data
      if (lineItemsRef?.current?.updateAgreementDates) {
        lineItemsRef.current.updateAgreementDates({ startDate: null, endDate: null });
      }
      if (lineItemsRef?.current?.loadAgreementProducts) {
        lineItemsRef.current.loadAgreementProducts(null);
      }
    } else {
      setSelectedCompany(null);
      onChange('company', '');
      onChange('commercialAgreement', '');
      onChange('currency', '');
      
      // Clear agreement-related data
      if (lineItemsRef?.current?.updateAgreementDates) {
        lineItemsRef.current.updateAgreementDates({ startDate: null, endDate: null });
      }
      if (lineItemsRef?.current?.loadAgreementProducts) {
        lineItemsRef.current.loadAgreementProducts(null);
      }
    }
  };

  const handleCommercialAgreementChange = (value) => {
    if (!isEditMode) return;

    const selectedAgreement = agreements.find(agreement => agreement.value === value);

    onChange('commercialAgreement', value);

    if (selectedAgreement && selectedAgreement.value !== "") {
      console.log(`📜 Agreement selected: ${selectedAgreement.label}`);

      // Fetch agreement dates for the selected commercial agreement
      fetchAgreementDates(value);

      // Get currency from the selected agreement (included in fetchAgreementsByCompany response)
      if (selectedAgreement.currency) {
        onChange('currency', selectedAgreement.currency);
        console.log(`💰 Currency set from agreement moneda: ${selectedAgreement.currency}`);
      } else {
        console.log(`⚠️ No currency found in agreement data for: ${selectedAgreement.label}`);
        onChange('currency', 'MXN'); // Default fallback
      }

      // Load agreement products for pricing overrides in LineItems component
      if (lineItemsRef?.current?.loadAgreementProducts) {
        console.log(`🔄 Loading agreement products for selected agreement: ${value}`);
        lineItemsRef.current.loadAgreementProducts(value);
      }
    } else {
      // Clear agreement dates when no agreement is selected
      if (lineItemsRef?.current?.updateAgreementDates) {
        lineItemsRef.current.updateAgreementDates({ startDate: null, endDate: null });
      }
      
      // Clear agreement products when no agreement is selected
      if (lineItemsRef?.current?.loadAgreementProducts) {
        console.log(`🔄 Clearing agreement products - no agreement selected`);
        lineItemsRef.current.loadAgreementProducts(null);
      }
      
      onChange('currency', '');
    }
  };

  // === CLEAR SEARCH FUNCTIONS ===
  const clearCompanySearch = () => {
    if (!isEditMode) return;
    setCompanySearchTerm("");
    setCompanyErrorMessage("");
    setLastCompanySearchTerm("");
    setCompanies([{ label: "Select Company", value: "" }]);
    setSelectedCompany(null);
    onChange('company', '');
    onChange('commercialAgreement', '');
    onChange('currency', '');
    setAgreements([{ label: "Select Commercial Agreement", value: "" }]);
  };

  // === MODE CONTROL FUNCTIONS ===
  // Removed browse/search mode switching for commercial agreements

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
           !formData.company ||
           !formData.commercialAgreement;
  };

  // === STATUS MESSAGES ===
  const getCompanyStatusMessage = () => {
    if (!isEditMode) return "";
    if (isCompanySearching) return "Searching companies...";
    if (isCompanyLoading) return "Loading companies...";
    if (lastCompanySearchTerm) {
      const count = companies.length > 1 ? companies.length - 1 : 0;
      return `${count} results for "${lastCompanySearchTerm}"`;
    }
    return "";
  };

  const getAgreementStatusMessage = () => {
    if (!isEditMode) return "";
    if (isAgreementLoading) return "Loading agreements...";
    if (selectedCompany && selectedCompany.value) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} agreements for ${selectedCompany.companyName || selectedCompany.label}`;
    }
    return "";
  };

  const statusDisplay = getSaveStatusDisplay();

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Validate required fields
      if (!formData.company) {
        return "Please select a Company.";
      }
      if (!formData.commercialAgreement) {
        return "Please select a Commercial Agreement.";
      }
      await saveCommercialAgreement();
      if (saveError) return saveError;
      if (saveState === COMPONENT_SAVE_STATES.ERROR) return "Failed to save Commercial Agreement.";
      return null;
    }
  }));

  return (
    <Tile>
      <Heading>Commercial Agreement</Heading>
      <Divider />


      <Box marginTop="medium">
        <Flex direction="row" gap="medium" wrap="wrap">
          {/* COMPANY SEARCH - VIEW/EDIT MODE */}
          <Box flex={1} minWidth="250px">
            {/* View Mode: Simple Input Display */}
            {!isEditMode && (
              <Input
                label="Company *"
                name="company"
                placeholder="No company selected"
                value={
                  displayLabels.company || 
                  (formData.company ? formData.company : "")
                }
                readOnly={true}
              />
            )}

            {/* Edit Mode: Company Search Interface */}
            {isEditMode && (
              <>
                <Flex gap="small" direction="row" align="end">
                  <Box flex={1}>
                    <Input
                      label="Search Companies *"
                      name="searchCompanies"
                      placeholder="Enter company name..."
                      value={companySearchTerm}
                      onChange={(value) => setCompanySearchTerm(value)}
                      disabled={isCompanyLoading || isCompanySearching}
                    />
                  </Box>
                  <Box>
                    <Button 
                      onClick={performCompanySearch}
                      disabled={!companySearchTerm.trim() || isCompanySearching || isCompanyLoading}
                    >
                      {isCompanySearching ? "🔄 Searching..." : "🔍 Search"}
                    </Button>
                  </Box>
                  {lastCompanySearchTerm && (
                    <Box>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={clearCompanySearch}
                      >
                        ✕ Clear
                      </Button>
                    </Box>
                  )}
                </Flex>

                {/* Company Search Results */}
                {lastCompanySearchTerm && companies.length > 1 && (
                  <Box marginTop="small">
                    <Select
                      label="Select Company"
                      name="companyResults"
                      options={companies}
                      value={selectedCompany?.value || ""}
                      onChange={(value) => handleCompanyChange(value)}
                      disabled={isCompanySearching}
                    />
                  </Box>
                )}

                {/* Company Status Messages */}
                {getCompanyStatusMessage() && (
                  <Text variant="microcopy" format={{ color: 'medium' }}>
                    {getCompanyStatusMessage()}
                  </Text>
                )}

                {/* Company Error Messages */}
                {companyErrorMessage && (
                  <Box marginTop="extra-small">
                    <Text variant="microcopy" format={{ color: 'error' }}>
                      {companyErrorMessage}
                    </Text>
                    <Box marginTop="extra-small">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          setCompanyErrorMessage("");
                          if (lastCompanySearchTerm) {
                            performCompanySearch();
                          }
                        }}
                        disabled={isCompanyLoading}
                      >
                        Retry
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Flex>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* COMMERCIAL AGREEMENTS - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
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

              {/* Edit Mode: Agreement Selection (only when company is selected) */}
              {isEditMode && (
                <>
                  {selectedCompany && selectedCompany.value ? (
                    <>
                      <Select
                        label="Commercial Agreement *"
                        name="commercialAgreement"
                        options={agreements}
                        value={formData.commercialAgreement}
                        onChange={(value) => handleCommercialAgreementChange(value)}
                        disabled={isAgreementLoading}
                      />
                      
                      {/* Show saved data hint if no selection but we have agreements */}
                      {!formData.commercialAgreement && agreements.length > 1 && (
                        <Text variant="microcopy" format={{ color: 'info' }} marginTop="extra-small">
                          💡 Previously saved data available - select an agreement above
                        </Text>
                      )}

                      {/* Agreement Status Messages */}
                      {getAgreementStatusMessage() && (
                        <Text variant="microcopy" format={{ color: 'medium' }}>
                          {getAgreementStatusMessage()}
                        </Text>
                      )}

                      {/* Agreement Error Messages */}
                      {agreementErrorMessage && (
                        <Box marginTop="extra-small">
                          <Text variant="microcopy" format={{ color: 'error' }}>
                            {agreementErrorMessage}
                          </Text>
                          <Box marginTop="extra-small">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => {
                                setAgreementErrorMessage("");
                                fetchAgreementsByCompany(selectedCompany.value);
                              }}
                              disabled={isAgreementLoading}
                            >
                              Retry
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </>
                  ) : (
                    <>
                      <Input
                        label="Commercial Agreement *"
                        name="commercialAgreement"
                        placeholder="Please select a company first"
                        value=""
                        readOnly={true}
                      />
                      <Text variant="microcopy" format={{ color: 'medium' }}>
                        Select a company above to view associated commercial agreements
                      </Text>
                    </>
                  )}
                </>
              )}
            </Box>
          </Flex>
        </Box>

        <Box marginTop="medium">
          <Flex direction="row" gap="medium" wrap="wrap">
            {/* CURRENCY - VIEW/EDIT MODE */}
            <Box flex={1} minWidth="250px">
              <Input
                label="Currency"
                name="currency"
                value={formData.currency}
                placeholder={
                  !isEditMode ? "No currency information" :
                  !selectedCompany ? 'Select company and agreement first' : 
                  !formData.commercialAgreement ? 'Select commercial agreement first' :
                  formData.currency ? 'Currency from agreement' : 'Not found'
                }
                readOnly={true}
              />
              {isEditMode && formData.currency && (
                <Text variant="microcopy" format={{ color: 'success' }}>
                  Currency automatically set from selected agreement
                </Text>
              )}
            </Box>
          </Flex>
        </Box>
      </Box>
    </Tile>
  );
});

export default CommercialAgreement;