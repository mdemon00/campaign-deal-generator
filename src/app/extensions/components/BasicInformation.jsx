// src/app/extensions/components/BasicInformation.jsx
// Updated version with both commercial agreement AND advertiser search handling

import React, { useState, useEffect, useCallback } from "react";
import {
  Input,
  Select,
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text,
  Button
} from "@hubspot/ui-extensions";

import { 
  COMMERCIAL_AGREEMENTS,
  DEAL_OWNER_OPTIONS
} from '../utils/constants.js';

const BasicInformation = ({ formData, onChange, runServerless }) => {
  // Commercial Agreements State
  const [agreements, setAgreements] = useState(COMMERCIAL_AGREEMENTS);
  const [agreementSearchTerm, setAgreementSearchTerm] = useState("");
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [isAgreementSearching, setIsAgreementSearching] = useState(false);
  const [hasAgreementLoaded, setHasAgreementLoaded] = useState(false);
  const [agreementErrorMessage, setAgreementErrorMessage] = useState("");
  const [useAgreementSearchMode, setUseAgreementSearchMode] = useState(false);
  const [agreementHasMore, setAgreementHasMore] = useState(false);
  const [companyStatus, setCompanyStatus] = useState("");

  // Advertisers State
  const [advertisers, setAdvertisers] = useState([{ label: "Select Advertiser", value: "" }]);
  const [advertiserSearchTerm, setAdvertiserSearchTerm] = useState("");
  const [isAdvertiserLoading, setIsAdvertiserLoading] = useState(false);
  const [isAdvertiserSearching, setIsAdvertiserSearching] = useState(false);
  const [hasAdvertiserLoaded, setHasAdvertiserLoaded] = useState(false);
  const [advertiserErrorMessage, setAdvertiserErrorMessage] = useState("");
  const [useAdvertiserSearchMode, setUseAdvertiserSearchMode] = useState(false);
  const [advertiserHasMore, setAdvertiserHasMore] = useState(false);

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // === COMMERCIAL AGREEMENTS FUNCTIONS ===

  // Search commercial agreements
  const performAgreementSearch = async (term) => {
    if (!runServerless) return;

    setIsAgreementSearching(true);
    setAgreementErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          searchTerm: term,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
        console.log(`🔍 Agreement search results: ${data.totalCount} matches for "${term}"`);
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

  // Load default commercial agreements
  const loadDefaultAgreements = async () => {
    if (!runServerless) return;

    setIsAgreementLoading(true);
    setAgreementErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchCommercialAgreements",
        parameters: {
          loadAll: false,
          limit: 20
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAgreements(data.options || COMMERCIAL_AGREEMENTS);
        setAgreementHasMore(data.hasMore || false);
        console.log(`✅ Loaded ${data.totalCount} default agreements`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error loading agreements:", error);
      setAgreementErrorMessage(`Error: ${error.message}`);
      setAgreements(COMMERCIAL_AGREEMENTS);
    } finally {
      setIsAgreementLoading(false);
      setHasAgreementLoaded(true);
    }
  };

  // === ADVERTISER FUNCTIONS ===

  // Search advertisers
  const performAdvertiserSearch = async (term) => {
    if (!runServerless) return;

    setIsAdvertiserSearching(true);
    setAdvertiserErrorMessage("");

    try {
      const response = await runServerless({
        name: "searchAdvertisers",
        parameters: {
          searchTerm: term,
          page: 1,
          limit: 50
        }
      });

      if (response && response.status === "SUCCESS" && response.response && response.response.data) {
        const data = response.response.data;
        setAdvertisers(data.options || [{ label: "Select Advertiser", value: "" }]);
        setAdvertiserHasMore(data.hasMore || false);
        console.log(`🔍 Advertiser search results: ${data.totalCount} matches for "${term}"`);
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

  // Load default advertisers
  const loadDefaultAdvertisers = async () => {
    if (!runServerless) return;

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
        console.log(`✅ Loaded ${data.totalCount} default advertisers`);
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

  // === DEBOUNCED SEARCH FUNCTIONS ===

  // Debounced agreement search
  const debouncedAgreementSearch = useCallback(
    debounce((term) => {
      if (term.trim() === "") {
        loadDefaultAgreements();
        setUseAgreementSearchMode(false);
      } else {
        performAgreementSearch(term.trim());
        setUseAgreementSearchMode(true);
      }
    }, 500),
    [runServerless]
  );

  // Debounced advertiser search
  const debouncedAdvertiserSearch = useCallback(
    debounce((term) => {
      if (term.trim() === "") {
        loadDefaultAdvertisers();
        setUseAdvertiserSearchMode(false);
      } else {
        performAdvertiserSearch(term.trim());
        setUseAdvertiserSearchMode(true);
      }
    }, 500),
    [runServerless]
  );

  // === INITIAL LOAD ===
  useEffect(() => {
    if (runServerless && !hasAgreementLoaded) {
      loadDefaultAgreements();
    }
    if (runServerless && !hasAdvertiserLoaded) {
      loadDefaultAdvertisers();
    }
  }, [runServerless, hasAgreementLoaded, hasAdvertiserLoaded]);

  // === EVENT HANDLERS ===

  // Handle agreement search input change
  const handleAgreementSearchChange = (value) => {
    setAgreementSearchTerm(value);
    debouncedAgreementSearch(value);
  };

  // Handle advertiser search input change
  const handleAdvertiserSearchChange = (value) => {
    setAdvertiserSearchTerm(value);
    debouncedAdvertiserSearch(value);
  };

  // Handle agreement selection
  const handleCommercialAgreementChange = (value) => {
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

  // Handle advertiser selection
  const handleAdvertiserChange = (value) => {
    const selectedAdvertiser = advertisers.find(advertiser => advertiser.value === value);
    
    onChange('advertiser', value);
    
    if (selectedAdvertiser && selectedAdvertiser.value !== "" && selectedAdvertiser.value !== "new") {
      setAdvertiserSearchTerm(selectedAdvertiser.label);
      setUseAdvertiserSearchMode(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === 'commercialAgreement') {
      handleCommercialAgreementChange(value);
    } else if (field === 'advertiser') {
      handleAdvertiserChange(value);
    } else {
      onChange(field, value);
    }
  };

  // === UI HELPER FUNCTIONS ===

  // Agreement mode controls
  const switchAgreementToBrowseMode = () => {
    setUseAgreementSearchMode(false);
    setAgreementSearchTerm("");
    loadDefaultAgreements();
  };

  const switchAgreementToSearchMode = () => {
    setUseAgreementSearchMode(true);
    setAgreementSearchTerm("");
  };

  const clearAgreementSelection = () => {
    setAgreementSearchTerm("");
    onChange('commercialAgreement', '');
    onChange('company', '');
    onChange('currency', '');
    setCompanyStatus("");
    setUseAgreementSearchMode(false);
    loadDefaultAgreements();
  };

  // Advertiser mode controls
  const switchAdvertiserToBrowseMode = () => {
    setUseAdvertiserSearchMode(false);
    setAdvertiserSearchTerm("");
    loadDefaultAdvertisers();
  };

  const switchAdvertiserToSearchMode = () => {
    setUseAdvertiserSearchMode(true);
    setAdvertiserSearchTerm("");
  };

  const clearAdvertiserSelection = () => {
    setAdvertiserSearchTerm("");
    onChange('advertiser', '');
    setUseAdvertiserSearchMode(false);
    loadDefaultAdvertisers();
  };

  // Status messages
  const getAgreementStatusMessage = () => {
    if (isAgreementSearching) return "Searching agreements...";
    if (isAgreementLoading) return "Loading agreements...";
    if (useAgreementSearchMode && agreementSearchTerm) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} matches for "${agreementSearchTerm}"`;
    }
    if (agreements.length > 1) {
      const count = agreements.length - 1;
      return `${count} agreements available${agreementHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getAdvertiserStatusMessage = () => {
    if (isAdvertiserSearching) return "Searching advertisers...";
    if (isAdvertiserLoading) return "Loading advertisers...";
    if (useAdvertiserSearchMode && advertiserSearchTerm) {
      const count = advertisers.length > 1 ? advertisers.length - 1 : 0;
      return `${count} matches for "${advertiserSearchTerm}"`;
    }
    if (advertisers.length > 1) {
      const count = advertisers.length - 1;
      return `${count} advertisers available${advertiserHasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  const getCompanyInputStyle = () => {
    if (formData.company === 'No company found') {
      return { color: '#d73a49', fontStyle: 'italic' };
    } else if (formData.company && formData.company !== 'Loading company...') {
      return { color: '#28a745', fontWeight: '500' };
    }
    return {};
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
          
          {/* COMMERCIAL AGREEMENTS SECTION */}
          <Box flex={1} minWidth="250px">
            {/* Agreement Mode Toggle Buttons */}
            <Flex gap="small" marginBottom="small">
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
              {(formData.commercialAgreement || agreementSearchTerm) && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearAgreementSelection}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>

            {/* Agreement Search Mode: Input field */}
            {useAgreementSearchMode ? (
              <Input
                label="Search Commercial Agreements *"
                name="searchAgreements"
                placeholder="Type agreement name to search..."
                value={agreementSearchTerm}
                onChange={handleAgreementSearchChange}
                disabled={isAgreementLoading || isAgreementSearching}
              />
            ) : (
              /* Agreement Browse Mode: Dropdown */
              <Select
                label="Commercial Agreement *"
                name="commercialAgreement"
                options={agreements}
                value={formData.commercialAgreement}
                onChange={(value) => handleFieldChange("commercialAgreement", value)}
                required
                disabled={isAgreementLoading}
              />
            )}

            {/* Agreement Search Results for Search Mode */}
            {useAgreementSearchMode && agreementSearchTerm && agreements.length > 1 && (
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

            {/* Agreement Status Message */}
            {getAgreementStatusMessage() && (
              <Text variant="microcopy" format={{ color: 'medium' }}>
                {getAgreementStatusMessage()}
              </Text>
            )}
            
            {/* Agreement Error Message */}
            {agreementErrorMessage && (
              <Box marginTop="extra-small">
                <Text variant="microcopy" format={{ color: 'error' }}>
                  {agreementErrorMessage}
                </Text>
                <Box marginTop="extra-small">
                  <Button 
                    variant="secondary" 
                    size="xs"
                    onClick={loadDefaultAgreements}
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
            <Box flex={1} minWidth="250px">
              <Input
                label="Company"
                name="company"
                placeholder="Auto-populated from agreement"
                value={formData.company}
                readOnly
                style={getCompanyInputStyle()}
              />
              
              {/* Company Status Message */}
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
            
            {/* ADVERTISERS SECTION */}
            <Box flex={1} minWidth="250px">
              {/* Advertiser Mode Toggle Buttons */}
              <Flex gap="small" marginBottom="small">
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
                {(formData.advertiser || advertiserSearchTerm) && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={clearAdvertiserSelection}
                  >
                    ✕ Clear
                  </Button>
                )}
              </Flex>

              {/* Advertiser Search Mode: Input field */}
              {useAdvertiserSearchMode ? (
                <Input
                  label="Search Advertisers *"
                  name="searchAdvertisers"
                  placeholder="Type advertiser name to search..."
                  value={advertiserSearchTerm}
                  onChange={handleAdvertiserSearchChange}
                  disabled={isAdvertiserLoading || isAdvertiserSearching}
                />
              ) : (
                /* Advertiser Browse Mode: Dropdown */
                <Select
                  label="Advertiser *"
                  name="advertiser"
                  options={advertisers}
                  value={formData.advertiser}
                  onChange={(value) => handleFieldChange("advertiser", value)}
                  required
                  disabled={isAdvertiserLoading}
                />
              )}

              {/* Advertiser Search Results for Search Mode */}
              {useAdvertiserSearchMode && advertiserSearchTerm && advertisers.length > 1 && (
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

              {/* Advertiser Status Message */}
              {getAdvertiserStatusMessage() && (
                <Text variant="microcopy" format={{ color: 'medium' }}>
                  {getAdvertiserStatusMessage()}
                </Text>
              )}
              
              {/* Advertiser Error Message */}
              {advertiserErrorMessage && (
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
                placeholder={formData.company === 'No company found' ? 'No currency available' : 'Auto-populated'}
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