// src/app/extensions/components/BasicInformation.jsx
// Updated version with company association handling

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
  ADVERTISER_OPTIONS,
  DEAL_OWNER_OPTIONS
} from '../utils/constants.js';

const BasicInformation = ({ formData, onChange, runServerless }) => {
  // State
  const [agreements, setAgreements] = useState(COMMERCIAL_AGREEMENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [useSearchMode, setUseSearchMode] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [companyStatus, setCompanyStatus] = useState(""); // Track company association status

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

  // Search function
  const performSearch = async (term) => {
    if (!runServerless) return;

    setIsSearching(true);
    setErrorMessage("");

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
        setHasMore(data.hasMore || false);
        console.log(`🔍 Search results: ${data.totalCount} matches for "${term}"`);
      } else {
        throw new Error("Invalid search response");
      }
    } catch (error) {
      console.error("Search error:", error);
      setErrorMessage(`Search failed: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Load default agreements
  const loadDefaultAgreements = async () => {
    if (!runServerless) return;

    setIsLoading(true);
    setErrorMessage("");

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
        setHasMore(data.hasMore || false);
        console.log(`✅ Loaded ${data.totalCount} default agreements`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error loading agreements:", error);
      setErrorMessage(`Error: ${error.message}`);
      setAgreements(COMMERCIAL_AGREEMENTS);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term) => {
      if (term.trim() === "") {
        loadDefaultAgreements();
        setUseSearchMode(false);
      } else {
        performSearch(term.trim());
        setUseSearchMode(true);
      }
    }, 500),
    [runServerless]
  );

  // Initial load
  useEffect(() => {
    if (runServerless && !hasLoaded) {
      loadDefaultAgreements();
    }
  }, [runServerless, hasLoaded]);

  // Handle search input change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Handle agreement selection with enhanced company handling
  const handleCommercialAgreementChange = (value) => {
    const selectedAgreement = agreements.find(agreement => agreement.value === value);
    
    onChange('commercialAgreement', value);
    
    if (selectedAgreement && selectedAgreement.value !== "") {
      // Set search term to show selected agreement name
      setSearchTerm(selectedAgreement.label);
      setUseSearchMode(false);
      
      // Handle company association
      if (selectedAgreement.hasCompany === false) {
        // No company associated
        onChange('company', 'No company found');
        onChange('currency', '');
      } else if (selectedAgreement.company && selectedAgreement.company !== 'No company found') {
        // Company found
        onChange('company', selectedAgreement.company);
        onChange('currency', selectedAgreement.currency || '');
      } else {
        // Unknown status
        onChange('company', 'Loading company...');
        setCompanyStatus("🔄 Fetching company information...");
        onChange('currency', '');
      }
    } else {
      // No agreement selected
      onChange('company', '');
      onChange('currency', '');
      setCompanyStatus("");
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === 'commercialAgreement') {
      handleCommercialAgreementChange(value);
    } else {
      onChange(field, value);
    }
  };

  // Switch to browse mode
  const switchToBrowseMode = () => {
    setUseSearchMode(false);
    setSearchTerm("");
    loadDefaultAgreements();
  };

  // Switch to search mode
  const switchToSearchMode = () => {
    setUseSearchMode(true);
    setSearchTerm("");
  };

  // Clear selection
  const clearSelection = () => {
    setSearchTerm("");
    onChange('commercialAgreement', '');
    onChange('company', '');
    onChange('currency', '');
    setCompanyStatus("");
    setUseSearchMode(false);
    loadDefaultAgreements();
  };

  // Get status message
  const getStatusMessage = () => {
    if (isSearching) return "Searching agreements...";
    if (isLoading) return "Loading agreements...";
    if (useSearchMode && searchTerm) {
      const count = agreements.length > 1 ? agreements.length - 1 : 0;
      return `${count} matches for "${searchTerm}"`;
    }
    if (agreements.length > 1) {
      const count = agreements.length - 1;
      return `${count} agreements available${hasMore ? ' (load more below)' : ''}`;
    }
    return "";
  };

  // Get company display style based on status
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
          
          <Box flex={1} minWidth="250px">
            {/* Mode Toggle Buttons */}
            <Flex gap="small" marginBottom="small">
              <Button
                variant={!useSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchToBrowseMode}
                disabled={isLoading}
              >
                📋 Browse
              </Button>
              <Button
                variant={useSearchMode ? "primary" : "secondary"}
                size="xs"
                onClick={switchToSearchMode}
                disabled={isLoading}
              >
                🔍 Search
              </Button>
              {(formData.commercialAgreement || searchTerm) && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={clearSelection}
                >
                  ✕ Clear
                </Button>
              )}
            </Flex>

            {/* Search Mode: Input field */}
            {useSearchMode ? (
              <Input
                label="Search Commercial Agreements *"
                name="searchAgreements"
                placeholder="Type agreement name to search..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isLoading || isSearching}
              />
            ) : (
              /* Browse Mode: Dropdown */
              <Select
                label="Commercial Agreement *"
                name="commercialAgreement"
                options={agreements}
                value={formData.commercialAgreement}
                onChange={(value) => handleFieldChange("commercialAgreement", value)}
                required
                disabled={isLoading}
              />
            )}

            {/* Search Results for Search Mode */}
            {useSearchMode && searchTerm && agreements.length > 1 && (
              <Box marginTop="small">
                <Select
                  label="Select from search results"
                  name="searchResults"
                  options={agreements}
                  value={formData.commercialAgreement}
                  onChange={(value) => handleFieldChange("commercialAgreement", value)}
                  disabled={isSearching}
                />
              </Box>
            )}

            {/* Status Message */}
            {getStatusMessage() && (
              <Text variant="microcopy" format={{ color: 'medium' }}>
                {getStatusMessage()}
              </Text>
            )}

            {/* Load More for Browse Mode */}
            {!useSearchMode && hasMore && (
              <Box marginTop="small">
                <Button 
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    // Load more functionality would go here
                    console.log("Load more clicked");
                  }}
                  disabled={isLoading}
                >
                  Load More Agreements
                </Button>
              </Box>
            )}
            
            {/* Error Message */}
            {errorMessage && (
              <Box marginTop="extra-small">
                <Text variant="microcopy" format={{ color: 'error' }}>
                  {errorMessage}
                </Text>
                <Box marginTop="extra-small">
                  <Button 
                    variant="secondary" 
                    size="xs"
                    onClick={loadDefaultAgreements}
                    disabled={isLoading}
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
            <Box flex={1} minWidth="250px">
              <Select
                label="Advertiser *"
                name="advertiser"
                options={ADVERTISER_OPTIONS}
                value={formData.advertiser}
                onChange={(value) => handleFieldChange("advertiser", value)}
                required
              />
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