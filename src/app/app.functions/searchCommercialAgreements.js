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
      selectedAgreementId = ""
    } = context.parameters;

    // console.log($2

    const COMMERCIAL_AGREEMENTS_OBJECT_ID = "2-39552013";

    // Determine search strategy
    if (searchTerm && searchTerm.trim() !== "") {
      return await searchAgreementsWithAPI(hubspotClient, COMMERCIAL_AGREEMENTS_OBJECT_ID, searchTerm.trim());
    } else if (loadAll) {
      return await getPaginatedAgreementsWithAPI(hubspotClient, COMMERCIAL_AGREEMENTS_OBJECT_ID, page, limit, selectedAgreementId);
    } else {
      return await getDefaultAgreementsWithAPI(hubspotClient, COMMERCIAL_AGREEMENTS_OBJECT_ID, limit, selectedAgreementId);
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
 * 🆕 FIXED: Use Search API for recently created records first
 */
async function searchAgreementsWithAPI(hubspotClient, objectId, searchTerm) {
  console.log(`🔍 [SEARCH] Starting commercial agreement search for: "${searchTerm}"`);

  try {
    // Search through ALL commercial agreements by paginating through the Search API
    let allAgreements = [];
    let hasMore = true;
    let after = undefined;
    const batchSize = 100;
    
    while (hasMore && allAgreements.length < 1000) { // Safety limit of 1000 agreements
      const searchRequest = {
        limit: batchSize,
        properties: ['status', 'elegir_moneda'],
        sorts: [
          {
            propertyName: "createdate", // Sort by creation date
            direction: "DESCENDING"     // Newest first
          }
        ]
        // No filters - get all records, then filter client-side
      };
      
      if (after) {
        searchRequest.after = after;
      }

      const searchResponse = await hubspotClient.apiRequest({
        method: 'POST',
        path: `/crm/v3/objects/${objectId}/search`,
        body: searchRequest
      });

      const searchData = await searchResponse.json();
      
      if (!searchData.results || searchData.results.length === 0) {
        break;
      }
      
      allAgreements.push(...searchData.results);
      
      // Check if there are more pages
      if (searchData.paging && searchData.paging.next && searchData.paging.next.after) {
        after = searchData.paging.next.after;
      } else {
        hasMore = false;
      }
      
      // If we got less than the batch size, we've reached the end
      if (searchData.results.length < batchSize) {
        hasMore = false;
      }
    }

    console.log(`🔍 [SEARCH] Fetched ${allAgreements.length} total commercial agreements from HubSpot`);

    if (allAgreements.length === 0) {
      console.warn(`⚠️ [SEARCH] No commercial agreements found in system`);
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Commercial Agreement", value: "" }],
          totalCount: 0,
          searchTerm: searchTerm,
          isSearchResult: true,
          hasMore: false,
          timestamp: Date.now()
        }
      };
    }

    // Filter agreements by search term (case-insensitive) - search across multiple fields
    const filteredAgreements = allAgreements.filter((agreement) => {
      const searchableFields = [
        agreement.properties.status,
        agreement.properties.name,
        agreement.properties.agreement_name,
        agreement.properties.title,
        agreement.properties.label,
        agreement.properties.display_name,
        agreement.id
      ];

      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    console.log(`🔍 [SEARCH] Filtered to ${filteredAgreements.length} matching commercial agreements`);

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

    console.log(`✅ [SEARCH] Final search results: ${processedAgreements.length} commercial agreements`);

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

  } catch (error) {
    console.error("❌ [SEARCH API] Error in searchAgreementsWithAPI:", error);
    
    // Fallback to limited search if full pagination fails
    console.log(`🔄 [SEARCH] Falling back to limited commercial agreement search`);
    try {
      const searchRequest = {
        limit: 200,
        properties: ['status', 'elegir_moneda'],
        sorts: [
          {
            propertyName: "createdate",
            direction: "DESCENDING"
          }
        ]
      };

      const searchResponse = await hubspotClient.apiRequest({
        method: 'POST',
        path: `/crm/v3/objects/${objectId}/search`,
        body: searchRequest
      });

      const searchData = await searchResponse.json();
      
      if (!searchData.results || searchData.results.length === 0) {
        throw new Error("No commercial agreements found in fallback search");
      }

      const filteredAgreements = searchData.results.filter((agreement) => {
        const searchableFields = [
          agreement.properties.status,
          agreement.properties.name,
          agreement.properties.agreement_name,
          agreement.properties.title,
          agreement.properties.label,
          agreement.properties.display_name,
          agreement.id
        ];

        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      const processedAgreements = await Promise.all(
        filteredAgreements.map((agreement, index) =>
          processAgreementWithCompany(hubspotClient, agreement, index)
        )
      );

      processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

      const options = [
        { label: "Select Commercial Agreement", value: "" },
        ...processedAgreements
      ];

      console.log(`✅ [FALLBACK] Fallback search results: ${processedAgreements.length} commercial agreements`);

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

    } catch (fallbackError) {
      console.error(`❌ [FALLBACK] Fallback search also failed:`, fallbackError);
      throw error; // Throw original error
    }
  }
}

/**
 * 🆕 FIXED: Use Search API for paginated results with recent records first
 */
async function getPaginatedAgreementsWithAPI(hubspotClient, objectId, page, limit, selectedAgreementId = "") {
  // console.log($2

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // 🔧 FIX: Use Search API with sorting to get recent records
    const searchRequest = {
      limit: Math.min(offset + limit + 10, 100), // Get slightly more for accurate hasMore
      properties: ['status', 'elegir_moneda'],
      sorts: [
        {
          propertyName: "createdate", // Sort by creation date
          direction: "DESCENDING"     // Newest first ⭐ KEY FIX
        }
      ]
      // No filters - get all records
    };

    // console.log($2

    // Use Search API endpoint
    const searchResponse = await hubspotClient.apiRequest({
      method: 'POST',
      path: `/crm/v3/objects/${objectId}/search`,
      body: searchRequest
    });

    const searchData = await searchResponse.json();
    // console.log($2

    if (!searchData.results || searchData.results.length === 0) {
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Commercial Agreement", value: "" }],
          totalCount: 0,
          totalAvailable: 0,
          page: page,
          hasMore: false,
          isPaginated: true,
          timestamp: Date.now()
        }
      };
    }

    // Slice results for the requested page
    let paginatedResults = searchData.results.slice(offset, offset + limit);
    let hasMore = searchData.results.length > (offset + limit);
    let totalAvailable = searchData.total || searchData.results.length;

    // Handle selected agreement inclusion (same logic as before)
    if (selectedAgreementId && selectedAgreementId.trim() !== "" && !paginatedResults.some(a => a.id === selectedAgreementId)) {
      try {
        const selectedAgreement = await hubspotClient.crm.objects.basicApi.getById(
          objectId,
          selectedAgreementId,
          ['status']
        );
        paginatedResults.unshift(selectedAgreement);
        if (paginatedResults.length > limit) {
          paginatedResults = paginatedResults.slice(0, limit);
        }
        totalAvailable++;
      } catch (error) {
        console.warn(`⚠️ Could not fetch selected agreement ${selectedAgreementId}:`, error.message);
      }
    }

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

    // console.log($2

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAgreements.length,
        totalAvailable: totalAvailable,
        page: page,
        hasMore: hasMore,
        isPaginated: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error("❌ [SEARCH API] Error in getPaginatedAgreementsWithAPI:", error);
    // Fallback to basic API if search fails
    // console.log($2
    return await getPaginatedAgreementsBasic(hubspotClient, objectId, page, limit, selectedAgreementId);
  }
}

/**
 * 🆕 FIXED: Use Search API for default results with recent records first
 */
async function getDefaultAgreementsWithAPI(hubspotClient, objectId, limit, selectedAgreementId = "") {
  // console.log($2

  try {
    // 🔧 FIX: Use Search API with sorting to get recent records
    const searchRequest = {
      limit: limit + 5, // Get slightly more to account for selected agreement
      properties: ['status', 'elegir_moneda'],
      sorts: [
        {
          propertyName: "createdate", // Sort by creation date
          direction: "DESCENDING"     // Newest first ⭐ KEY FIX
        }
      ]
      // No filters - get all records
    };

    // console.log($2

    // Use Search API endpoint
    const searchResponse = await hubspotClient.apiRequest({
      method: 'POST',
      path: `/crm/v3/objects/${objectId}/search`,
      body: searchRequest
    });

    const searchData = await searchResponse.json();
    // console.log($2

    if (!searchData.results || searchData.results.length === 0) {
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Commercial Agreement", value: "" }],
          totalCount: 0,
          totalAvailable: 0,
          hasMore: false,
          isDefault: true,
          timestamp: Date.now()
        }
      };
    }

    let results = searchData.results.slice(0, limit); // Take only the requested limit
    let totalAvailable = searchData.total || searchData.results.length;

    // Handle selected agreement inclusion (same logic as before)
    if (selectedAgreementId && selectedAgreementId.trim() !== "" && !results.some(a => a.id === selectedAgreementId)) {
      try {
        const selectedAgreement = await hubspotClient.crm.objects.basicApi.getById(
          objectId,
          selectedAgreementId,
          ['status']
        );
        results.unshift(selectedAgreement);
        if (results.length > limit) {
          results = results.slice(0, limit);
        }
        totalAvailable++;
      } catch (error) {
        console.warn(`⚠️ Could not fetch selected agreement ${selectedAgreementId}:`, error.message);
      }
    }

    // Process each agreement with company information
    const processedAgreements = await Promise.all(
      results.map((agreement, index) =>
        processAgreementWithCompany(hubspotClient, agreement, index)
      )
    );

    processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Commercial Agreement", value: "" },
      ...processedAgreements
    ];

    const hasMore = totalAvailable > limit;

    // console.log($2

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

  } catch (error) {
    console.error("❌ [SEARCH API] Error in getDefaultAgreementsWithAPI:", error);
    // Fallback to basic API if search fails
    // console.log($2
    return await getDefaultAgreementsBasic(hubspotClient, objectId, limit, selectedAgreementId);
  }
}

/**
 * 🔄 FALLBACK: Original search function using basic API
 */
async function searchAgreementsBasic(hubspotClient, objectId, searchTerm) {
  // console.log($2

  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    100,
    undefined,
    ['status']
  );

  const filteredAgreements = agreements.results.filter(agreement => {
    const status = agreement.properties.status || '';
    return status.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const processedAgreements = await Promise.all(
    filteredAgreements.map((agreement, index) =>
      processAgreementWithCompany(hubspotClient, agreement, index)
    )
  );

  processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...processedAgreements
  ];

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
 * 🔄 FALLBACK: Original pagination function using basic API
 */
async function getPaginatedAgreementsBasic(hubspotClient, objectId, page, limit, selectedAgreementId) {
  // console.log($2
  
  const offset = (page - 1) * limit;
  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    Math.min(offset + limit + 1, 101),
    undefined,
    ['status']
  );

  let paginatedResults = agreements.results.slice(offset, offset + limit);
  let hasMore = agreements.results.length > (offset + limit);
  let totalAvailable = agreements.total || agreements.results.length;

  // Handle selected agreement inclusion
  if (selectedAgreementId && selectedAgreementId.trim() !== "" && !paginatedResults.some(a => a.id === selectedAgreementId)) {
    try {
      const selectedAgreement = await hubspotClient.crm.objects.basicApi.getById(
        objectId,
        selectedAgreementId,
        ['status']
      );
      paginatedResults.unshift(selectedAgreement);
      if (paginatedResults.length > limit) {
        paginatedResults = paginatedResults.slice(0, limit);
      }
      totalAvailable++;
    } catch (error) {
      console.warn(`⚠️ Could not fetch selected agreement ${selectedAgreementId}:`, error.message);
    }
  }

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

  return {
    status: "SUCCESS",
    data: {
      options: options,
      totalCount: processedAgreements.length,
      totalAvailable: totalAvailable,
      page: page,
      hasMore: hasMore,
      isPaginated: true,
      timestamp: Date.now()
    }
  };
}

/**
 * 🔄 FALLBACK: Original default function using basic API
 */
async function getDefaultAgreementsBasic(hubspotClient, objectId, limit, selectedAgreementId) {
  // console.log($2

  const agreements = await hubspotClient.crm.objects.basicApi.getPage(
    objectId,
    limit,
    undefined,
    ['status']
  );

  let results = agreements.results;
  let totalAvailable = agreements.total || agreements.results.length;

  // Handle selected agreement inclusion
  if (selectedAgreementId && selectedAgreementId.trim() !== "" && !results.some(a => a.id === selectedAgreementId)) {
    try {
      const selectedAgreement = await hubspotClient.crm.objects.basicApi.getById(
        objectId,
        selectedAgreementId,
        ['status']
      );
      results.unshift(selectedAgreement);
      if (results.length > limit) {
        results = results.slice(0, limit);
      }
      totalAvailable++;
    } catch (error) {
      console.warn(`⚠️ Could not fetch selected agreement ${selectedAgreementId}:`, error.message);
    }
  }

  const processedAgreements = await Promise.all(
    results.map((agreement, index) =>
      processAgreementWithCompany(hubspotClient, agreement, index)
    )
  );

  processedAgreements.sort((a, b) => a.label.localeCompare(b.label));

  const options = [
    { label: "Select Commercial Agreement", value: "" },
    ...processedAgreements
  ];

  const hasMore = totalAvailable > limit;

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

/**
 * Fetch associated company details for an agreement
 * 🔧 MODIFIED: Get currency from agreement's elegir_moneda instead of company
 */
async function fetchAssociatedCompany(hubspotClient, agreementId) {
  try {
    // 🔧 STEP 1: Get agreement with elegir_moneda field
    const agreement = await hubspotClient.crm.objects.basicApi.getById(
      "2-39552013", // Commercial Agreements object ID
      agreementId,
      ['elegir_moneda'] // Fetch the currency field from agreement
    );

    // 🔧 STEP 2: Get associated company (for company name)
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "2-39552013",
      agreementId,
      "companies"
    );

    if (associations.results && associations.results.length > 0) {
      const companyId = associations.results[0].toObjectId;

      const company = await hubspotClient.crm.companies.basicApi.getById(
        companyId,
        ['name', 'domain', 'country'] // Removed hs_additional_currencies
      );

      return {
        id: company.id,
        name: company.properties.name || 'Unnamed Company',
        domain: company.properties.domain || '',
        country: company.properties.country || '',
        currency: agreement.properties.elegir_moneda || 'Not found' // 🔧 FIXED: Use agreement currency, show 'Not found' if empty
      };
    }

    // 🔧 STEP 3: If no company found, still return agreement currency
    return {
      id: null,
      name: 'No company found',
      domain: '',
      country: '',
      currency: agreement.properties.elegir_moneda || 'Not found' // 🔧 FIXED: Use agreement currency, show 'Not found' if empty
    };
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

  // Get currency directly from agreement properties first
  const agreementCurrency = agreement.properties.elegir_moneda || 'Not found';

  const associatedCompany = await fetchAssociatedCompany(hubspotClient, agreement.id);

  let companyName, currency, country;

  if (associatedCompany) {
    companyName = associatedCompany.name;
    // Use agreement currency over company currency
    currency = agreementCurrency;
    country = associatedCompany.country;
  } else {
    companyName = 'No company found';
    currency = agreementCurrency;
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