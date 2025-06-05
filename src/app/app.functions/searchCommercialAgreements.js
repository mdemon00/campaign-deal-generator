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
 * Fetch associated company details for an agreement
 */
async function fetchAssociatedCompany(hubspotClient, agreementId) {
  try {
    // Get associations to companies
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "2-39552013", // Commercial agreements object type
      agreementId,
      "companies"
    );

    if (associations.results && associations.results.length > 0) {
      // Get the first associated company
      const companyId = associations.results[0].toObjectId;
      
      // Fetch company details
      const company = await hubspotClient.crm.companies.basicApi.getById(
        companyId,
        ['name', 'domain', 'country', 'hs_additional_currencies']
      );

      return {
        id: company.id,
        name: company.properties.name || 'Unnamed Company',
        domain: company.properties.domain || '',
        country: company.properties.country || '',
        currency: company.properties.hs_additional_currencies || 'USD'
      };
    }

    return null;
  } catch (error) {
    console.warn(`⚠️ Could not fetch company for agreement ${agreementId}:`, error.message);
    return null;
  }
}

/**
 * Process agreement data with company information
 */
async function processAgreementWithCompany(hubspotClient, agreement, index) {
  const status = agreement.properties.status;
  const displayName = status && status.trim() !== '' 
    ? status 
    : `Agreement ${agreement.id}`;

  // Fetch associated company
  const associatedCompany = await fetchAssociatedCompany(hubspotClient, agreement.id);

  let companyName, currency, country;
  
  if (associatedCompany) {
    companyName = associatedCompany.name;
    currency = associatedCompany.currency;
    country = associatedCompany.country;
  } else {
    companyName = 'No company found';
    currency = '';
    country = '';
  }

  return {
    label: displayName,
    value: agreement.id,
    company: companyName,
    currency: currency,
    country: country,
    hasCompany: !!associatedCompany,
    companyId: associatedCompany?.id || null
  };
}

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
  const filteredAgreements = agreements.results.filter(agreement => {
    const status = agreement.properties.status || '';
    return status.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Process each agreement with company information
  const processedAgreements = await Promise.all(
    filteredAgreements.map((agreement, index) => 
      processAgreementWithCompany(hubspotClient, agreement, index)
    )
  );

  // Sort by name
  processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...processedAgreements
  ];

  console.log(`✅ Search found ${processedAgreements.length} matches for "${searchTerm}"`);

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: processedAgreements.length,
      searchTerm: searchTerm,
      isSearchResult: true,
      hasMore: false,
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

  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    Math.min(offset + limit, 100),
    undefined,
    ['status']
  );

  // Slice the results for the requested page
  const paginatedResults = agreements.results.slice(offset, offset + limit);

  // Process each agreement with company information
  const processedAgreements = await Promise.all(
    paginatedResults.map((agreement, index) => 
      processAgreementWithCompany(hubspotClient, agreement, index)
    )
  );

  processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...processedAgreements
  ];

  const hasMore = agreements.results.length > (offset + limit);

  console.log(`✅ Returned page ${page}: ${processedAgreements.length} agreements, hasMore: ${hasMore}`);

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: processedAgreements.length,
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

  // Process each agreement with company information
  const processedAgreements = await Promise.all(
    agreements.results.map((agreement, index) => 
      processAgreementWithCompany(hubspotClient, agreement, index)
    )
  );

  processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...processedAgreements
  ];

  const totalAvailable = agreements.total || agreements.results.length;
  const hasMore = totalAvailable > limit;

  console.log(`✅ Loaded ${processedAgreements.length} default agreements, hasMore: ${hasMore}`);

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: processedAgreements.length,
      totalAvailable: totalAvailable,
      hasMore: hasMore,
      isDefault: true,
      timestamp: Date.now()
    }
  };
}