const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { 
      searchTerm = "", 
      page = 1, 
      limit = 20, 
      loadAll = false,
      includeInactive = false
    } = context.parameters;

    console.log('🔍 Deal Owner Search Parameters:', { searchTerm, page, limit, loadAll, includeInactive });

    // Determine search strategy
    if (searchTerm && searchTerm.trim() !== "") {
      return await searchDealOwners(hubspotClient, searchTerm.trim(), includeInactive);
    } else if (loadAll) {
      return await getPaginatedDealOwners(hubspotClient, page, limit, includeInactive);
    } else {
      return await getDefaultDealOwners(hubspotClient, limit, includeInactive);
    }

  } catch (error) {
    console.error("❌ Error in deal owner search function:", error.message);
    console.error("❌ Full error:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Process owner data into consistent format
 */
function processOwnerData(owner, index) {
  console.log(`🔍 [DEBUG] Raw owner ${index + 1} data:`, {
    id: owner.id,
    firstName: owner.firstName,
    lastName: owner.lastName,
    email: owner.email,
    userId: owner.userId,
    archived: owner.archived,
    teams: owner.teams
  });

  const firstName = owner.firstName || '';
  const lastName = owner.lastName || '';
  const email = owner.email || '';
  
  // Create display name with fallback options
  let displayName;
  if (firstName && lastName) {
    displayName = `${firstName} ${lastName}`;
  } else if (firstName) {
    displayName = firstName;
  } else if (lastName) {
    displayName = lastName;
  } else if (email) {
    displayName = email;
  } else {
    displayName = `Owner ${owner.id}`;
  }

  // Add email suffix if we have both name and email
  const fullDisplayName = (firstName || lastName) && email 
    ? `${displayName} (${email})`
    : displayName;

  console.log(`✅ [DEBUG] Owner ${owner.id} processed: "${fullDisplayName}"`);

  return {
    label: fullDisplayName,
    value: owner.id,
    firstName: firstName,
    lastName: lastName,
    email: email,
    userId: owner.userId || null,
    teams: owner.teams || [],
    archived: owner.archived || false,
    displayName: displayName,
    fullDisplayName: fullDisplayName
  };
}

/**
 * Make direct API request to HubSpot Owners endpoint
 */
async function fetchOwners(hubspotClient, limit = 20, after = undefined, includeInactive = false) {
  console.log(`🔍 [API] Making direct API request to /crm/v3/owners`);
  
  try {
    const queryParams = { 
      limit: limit
    };
    
    if (after) {
      queryParams.after = after;
    }
    
    if (includeInactive) {
      queryParams.archived = true;
    }

    console.log(`🔍 [API] Query parameters:`, queryParams);

    const response = await hubspotClient.apiRequest({
      method: 'GET',
      path: '/crm/v3/owners',
      qs: queryParams
    });

    const data = await response.json();
    
    console.log(`🔍 [API] Raw response structure:`, {
      hasResults: !!data.results,
      resultCount: data.results?.length || 0,
      hasTotal: !!data.total,
      hasPaging: !!data.paging,
      responseKeys: Object.keys(data),
      sampleData: data.results?.[0] || 'No results'
    });

    console.log(`🔍 [API] Full response data:`, JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error(`❌ [API] Error fetching owners:`, error);
    throw error;
  }
}

/**
 * Search deal owners by term
 */
async function searchDealOwners(hubspotClient, searchTerm, includeInactive) {
  console.log(`🔍 [SEARCH] Starting deal owner search for: "${searchTerm}"`);

  try {
    // Fetch owners using direct API
    const ownersData = await fetchOwners(hubspotClient, 100, undefined, includeInactive);

    if (!ownersData.results || ownersData.results.length === 0) {
      console.warn(`⚠️ [SEARCH] No owners found in system`);
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Deal Owner", value: "" }],
          totalCount: 0,
          searchTerm: searchTerm,
          isSearchResult: true,
          hasMore: false,
          timestamp: Date.now()
        }
      };
    }

    console.log(`🔍 [SEARCH] Found ${ownersData.results.length} total owners, filtering by "${searchTerm}"`);

    // Filter owners by search term (case-insensitive)
    const filteredOwners = ownersData.results.filter((owner, index) => {
      const searchableFields = [
        owner.firstName,
        owner.lastName,
        owner.email,
        `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
        `${owner.lastName || ''} ${owner.firstName || ''}`.trim()
      ];

      const matches = searchableFields.some(field =>
        field && field.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matches) {
        console.log(`✅ [SEARCH] Owner ${owner.id} MATCHES search term "${searchTerm}"`);
      }

      return matches;
    });

    console.log(`🔍 [SEARCH] Filtered to ${filteredOwners.length} matching owners`);

    // Process each owner
    const processedOwners = filteredOwners.map((owner, index) => {
      return processOwnerData(owner, index);
    });

    // Sort by display name
    processedOwners.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const options = [
      { label: "Select Deal Owner", value: "" },
      ...processedOwners
    ];

    console.log(`✅ [SEARCH] Final search results for "${searchTerm}": ${processedOwners.length} matches`);

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedOwners.length,
        searchTerm: searchTerm,
        isSearchResult: true,
        hasMore: false,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [SEARCH] Error in searchDealOwners:`, error);
    throw error;
  }
}

/**
 * Get paginated deal owners for browsing
 */
async function getPaginatedDealOwners(hubspotClient, page, limit, includeInactive) {
  console.log(`📄 [PAGINATE] Getting deal owner page ${page} with limit ${limit}`);

  try {
    const fetchLimit = Math.min(page * limit, 100);
    
    // Fetch owners using direct API
    const ownersData = await fetchOwners(hubspotClient, fetchLimit, undefined, includeInactive);

    if (!ownersData.results || ownersData.results.length === 0) {
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Deal Owner", value: "" }],
          totalCount: 0,
          page: page,
          hasMore: false,
          isPaginated: true,
          timestamp: Date.now()
        }
      };
    }

    // Calculate pagination slice
    const offset = (page - 1) * limit;
    const paginatedResults = ownersData.results.slice(offset, offset + limit);
    console.log(`📄 [PAGINATE] Sliced to ${paginatedResults.length} results for page ${page}`);

    // Process each owner
    const processedOwners = paginatedResults.map((owner, index) => {
      return processOwnerData(owner, index);
    });

    processedOwners.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const options = [
      { label: "Select Deal Owner", value: "" },
      ...processedOwners
    ];

    const hasMore = ownersData.results.length > (offset + limit);

    console.log(`✅ [PAGINATE] Returned page ${page}: ${processedOwners.length} owners, hasMore: ${hasMore}`);

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedOwners.length,
        page: page,
        hasMore: hasMore,
        isPaginated: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [PAGINATE] Error in getPaginatedDealOwners:`, error);
    throw error;
  }
}

/**
 * Get default deal owners
 */
async function getDefaultDealOwners(hubspotClient, limit, includeInactive) {
  console.log(`🏠 [DEFAULT] Getting default deal owners (limit: ${limit})`);

  try {
    // Fetch owners using direct API
    const ownersData = await fetchOwners(hubspotClient, limit, undefined, includeInactive);

    if (!ownersData.results || ownersData.results.length === 0) {
      console.warn(`⚠️ [DEFAULT] No owners found in system`);
      
      // Check if we should try different parameters
      if (!includeInactive) {
        console.log(`🔄 [DEFAULT] Trying again with includeInactive=true to see if there are archived owners...`);
        const ownersDataWithArchived = await fetchOwners(hubspotClient, limit, undefined, true);
        
        if (ownersDataWithArchived.results && ownersDataWithArchived.results.length > 0) {
          console.log(`🔍 [DEBUG] Found ${ownersDataWithArchived.results.length} owners when including archived ones`);
        }
      }
      
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Deal Owner", value: "" }],
          totalCount: 0,
          totalAvailable: 0,
          hasMore: false,
          isDefault: true,
          timestamp: Date.now()
        }
      };
    }

    console.log(`🏠 [DEFAULT] Retrieved ${ownersData.results.length} default owners`);

    // Process each owner
    const processedOwners = ownersData.results.map((owner, index) => {
      return processOwnerData(owner, index);
    });

    processedOwners.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const options = [
      { label: "Select Deal Owner", value: "" },
      ...processedOwners
    ];

    // Check if there might be more owners
    const hasMore = ownersData.results.length >= limit;

    console.log(`✅ [DEFAULT] Loaded ${processedOwners.length} default owners, hasMore: ${hasMore}`);
    console.log(`🎯 [DEFAULT] Final processed owners:`, processedOwners.map(o => ({ id: o.value, label: o.label })));

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedOwners.length,
        totalAvailable: processedOwners.length,
        hasMore: hasMore,
        isDefault: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [DEFAULT] Error in getDefaultDealOwners:`, error.message);
    console.error(`❌ [DEFAULT] Full error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}