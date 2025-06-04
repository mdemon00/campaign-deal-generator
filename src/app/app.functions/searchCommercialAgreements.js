const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { 
      searchTerm = "", 
      page = 1, 
      limit = 20, 
      loadAll = false 
    } = context.parameters;

    console.log('🔍 Search Parameters:', { searchTerm, page, limit, loadAll });

    const COMMERCIAL_AGREEMENTS_OBJECT_ID = "2-39552013";

    // Determine search strategy
    if (searchTerm && searchTerm.trim() !== "") {
      return await searchAgreements(hubspotClient, COMMERCIAL_AGREEMENTS_OBJECT_ID, searchTerm.trim());
    } else if (loadAll) {
      return await getPaginatedAgreements(hubspotClient, COMMERCIAL_AGREEMENTS_OBJECT_ID, page, limit);
    } else {
      return await getDefaultAgreements(hubspotClient, COMMERCIAL_AGREEMENTS_OBJECT_ID, limit);
    }

  } catch (error) {
    console.error("❌ Error in search function:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Search agreements by term (searches ALL agreements)
 */
async function searchAgreements(hubspotClient, objectId, searchTerm) {
  console.log(`🔍 Searching for: "${searchTerm}"`);

  // Fetch more records when searching to ensure we find matches
  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    100, // Fetch more records for search
    undefined,
    ['status']
  );

  // Filter agreements by search term (case-insensitive)
  const filteredAgreements = agreements.results
    .filter(agreement => {
      const status = agreement.properties.status || '';
      return status.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .map((agreement, index) => {
      const status = agreement.properties.status;
      const displayName = status && status.trim() !== '' 
        ? status 
        : `Agreement ${agreement.id}`;
      
      return {
        label: displayName,
        value: agreement.id,
        company: '',
        currency: '',
        country: '',
        isSearchResult: true
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...filteredAgreements
  ];

  console.log(`✅ Search found ${filteredAgreements.length} matches for "${searchTerm}"`);

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: filteredAgreements.length,
      searchTerm: searchTerm,
      isSearchResult: true,
      hasMore: false, // Search shows all matches
      timestamp: Date.now()
    }
  };
}

/**
 * Get paginated agreements for browsing
 */
async function getPaginatedAgreements(hubspotClient, objectId, page, limit) {
  console.log(`📄 Getting page ${page} with limit ${limit}`);

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // For pagination, we'll fetch a larger batch and slice it
  // HubSpot's pagination works with 'after' parameter, but for simplicity we'll use limit/offset approach
  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    Math.min(offset + limit, 100), // Don't exceed 100 per API call
    undefined,
    ['status']
  );

  // Slice the results for the requested page
  const paginatedResults = agreements.results
    .slice(offset, offset + limit)
    .map((agreement, index) => {
      const status = agreement.properties.status;
      const displayName = status && status.trim() !== '' 
        ? status 
        : `Agreement ${agreement.id}`;
      
      return {
        label: displayName,
        value: agreement.id,
        company: '',
        currency: '',
        country: ''
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...paginatedResults
  ];

  const hasMore = agreements.results.length > (offset + limit);

  console.log(`✅ Returned page ${page}: ${paginatedResults.length} agreements, hasMore: ${hasMore}`);

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: paginatedResults.length,
      page: page,
      hasMore: hasMore,
      isPaginated: true,
      timestamp: Date.now()
    }
  };
}

/**
 * Get default agreements (most recent/popular)
 */
async function getDefaultAgreements(hubspotClient, objectId, limit) {
  console.log(`🏠 Getting default agreements (limit: ${limit})`);

  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    limit,
    undefined,
    ['status']
  );

  const agreementOptions = agreements.results
    .map((agreement, index) => {
      const status = agreement.properties.status;
      const displayName = status && status.trim() !== '' 
        ? status 
        : `Agreement ${agreement.id}`;
      
      return {
        label: displayName,
        value: agreement.id,
        company: '',
        currency: '',
        country: ''
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...agreementOptions
  ];

  const totalAvailable = agreements.total || agreements.results.length;
  const hasMore = totalAvailable > limit;

  console.log(`✅ Loaded ${agreementOptions.length} default agreements, hasMore: ${hasMore}`);

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: agreementOptions.length,
      totalAvailable: totalAvailable,
      hasMore: hasMore,
      isDefault: true,
      timestamp: Date.now()
    }
  };
}