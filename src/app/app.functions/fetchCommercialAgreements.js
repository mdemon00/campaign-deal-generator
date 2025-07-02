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

    const ADVERTISERS_OBJECT_ID = "2-40333244";

    // Determine search strategy
    if (searchTerm && searchTerm.trim() !== "") {
      return await searchAdvertisers(hubspotClient, ADVERTISERS_OBJECT_ID, searchTerm.trim());
    } else if (loadAll) {
      return await getPaginatedAdvertisers(hubspotClient, ADVERTISERS_OBJECT_ID, page, limit);
    } else {
      return await getDefaultAdvertisers(hubspotClient, ADVERTISERS_OBJECT_ID, limit);
    }

  } catch (error) {
    console.error("❌ Error in advertiser search function:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Fetch associated company details for an advertiser
 */
async function fetchAssociatedCompany(hubspotClient, advertiserId) {
  try {
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "2-40333244",
      advertiserId,
      "companies"
    );

    if (associations.results && associations.results.length > 0) {
      const companyId = associations.results[0].toObjectId;

      const company = await hubspotClient.crm.companies.basicApi.getById(
        companyId,
        ['name', 'domain', 'country']
      );

      return {
        id: company.id,
        name: company.properties.name || 'Unnamed Company',
        domain: company.properties.domain || '',
        country: company.properties.country || ''
      };
    }

    return null;
  } catch (error) {
    console.warn(`Could not fetch company for advertiser ${advertiserId}:`, error.message);
    return null;
  }
}

/**
 * Process advertiser data with company information
 */
async function processAdvertiserWithCompany(hubspotClient, advertiser, index) {
  // Try common field names for advertiser name with priority order
  const name = advertiser.properties.advertiser ||
    advertiser.properties.name ||
    advertiser.properties.advertiser_name ||
    advertiser.properties.title ||
    advertiser.properties.label ||
    advertiser.properties.display_name ||
    advertiser.properties.company_name ||
    advertiser.properties.brand_name ||
    advertiser.properties.client_name ||
    advertiser.properties.account_name ||
    advertiser.properties.business_name ||
    advertiser.properties.organization_name ||
    `Advertiser ${advertiser.id}`;

  const displayName = name && name.trim() !== '' ? name : `Advertiser ${advertiser.id}`;

  // Fetch associated company (optional for advertisers)
  const associatedCompany = await fetchAssociatedCompany(hubspotClient, advertiser.id);

  return {
    label: displayName,
    value: advertiser.id,
    name: displayName,
    company: associatedCompany?.name || '',
    companyId: associatedCompany?.id || null,
    hasCompany: !!associatedCompany,
    domain: advertiser.properties.domain || '',
    industry: advertiser.properties.industry || '',
    category: advertiser.properties.category || ''
  };
}

/**
 * Get custom properties for the advertiser object
 */
async function getCustomProperties(hubspotClient, objectId) {
  try {
    const schema = await hubspotClient.crm.schemas.coreApi.getById(objectId);
    return schema.properties
      .filter(prop => !prop.name.startsWith('hs_'))
      .map(prop => prop.name);
  } catch (error) {
    // Fallback to common property names
    return [
      'advertiser', 'name', 'title', 'label', 'advertiser_name',
      'brand_name', 'company_name', 'client_name', 'display_name'
    ];
  }
}

/**
 * Search advertisers by term
 */
async function searchAdvertisers(hubspotClient, objectId, searchTerm) {
  try {
    const availableProperties = await getCustomProperties(hubspotClient, objectId);

    const advertisers = await hubspotClient.crm.objects.basicApi.getPage(
      objectId,
      100,
      undefined,
      availableProperties.length > 0 ? availableProperties : undefined
    );

    if (!advertisers.results || advertisers.results.length === 0) {
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Advertiser", value: "" }],
          totalCount: 0,
          searchTerm: searchTerm,
          isSearchResult: true,
          hasMore: false,
          timestamp: Date.now()
        }
      };
    }

    const filteredAdvertisers = advertisers.results.filter((advertiser) => {
      const searchableFields = [
        advertiser.properties.advertiser,
        advertiser.properties.name,
        advertiser.properties.advertiser_name,
        advertiser.properties.title,
        advertiser.properties.label,
        advertiser.properties.display_name,
        advertiser.properties.company_name,
        advertiser.properties.brand_name,
        advertiser.properties.client_name,
        advertiser.properties.account_name,
        advertiser.properties.business_name,
        advertiser.properties.organization_name,
        advertiser.properties.domain
      ];

      return searchableFields.some(field =>
        field && field.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    const processedAdvertisers = await Promise.all(
      filteredAdvertisers.map((advertiser, index) =>
        processAdvertiserWithCompany(hubspotClient, advertiser, index)
      )
    );

    processedAdvertisers.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Advertiser", value: "" },
      ...processedAdvertisers
    ];

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAdvertisers.length,
        searchTerm: searchTerm,
        isSearchResult: true,
        hasMore: false,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error("Error in searchAdvertisers:", error);
    throw error;
  }
}

/**
 * Get paginated advertisers for browsing
 */
async function getPaginatedAdvertisers(hubspotClient, objectId, page, limit) {
  try {
    const offset = (page - 1) * limit;
    const availableProperties = await getCustomProperties(hubspotClient, objectId);

    const advertisers = await hubspotClient.crm.objects.basicApi.getPage(
      objectId,
      Math.min(offset + limit, 100),
      undefined,
      availableProperties.length > 0 ? availableProperties : undefined
    );

    const paginatedResults = advertisers.results.slice(offset, offset + limit);

    const processedAdvertisers = await Promise.all(
      paginatedResults.map((advertiser, index) =>
        processAdvertiserWithCompany(hubspotClient, advertiser, index)
      )
    );

    processedAdvertisers.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Advertiser", value: "" },
      ...processedAdvertisers,
    ];

    const hasMore = advertisers.results.length > (offset + limit);

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAdvertisers.length,
        page: page,
        hasMore: hasMore,
        isPaginated: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error("Error in getPaginatedAdvertisers:", error);
    throw error;
  }
}

/**
 * Get default advertisers
 */
async function getDefaultAdvertisers(hubspotClient, objectId, limit) {
  try {
    const availableProperties = await getCustomProperties(hubspotClient, objectId);

    const advertisers = await hubspotClient.crm.objects.basicApi.getPage(
      objectId,
      limit,
      undefined,
      availableProperties.length > 0 ? availableProperties : undefined
    );

    if (!advertisers.results || advertisers.results.length === 0) {
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Advertiser", value: "" }],
          totalCount: 0,
          totalAvailable: 0,
          hasMore: false,
          isDefault: true,
          timestamp: Date.now()
        }
      };
    }

    const processedAdvertisers = await Promise.all(
      advertisers.results.map((advertiser, index) =>
        processAdvertiserWithCompany(hubspotClient, advertiser, index)
      )
    );

    processedAdvertisers.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Advertiser", value: "" },
      ...processedAdvertisers,
    ];

    const totalAvailable = advertisers.total || advertisers.results.length;
    const hasMore = totalAvailable > limit;

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAdvertisers.length,
        totalAvailable: totalAvailable,
        hasMore: hasMore,
        isDefault: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error("Error in getDefaultAdvertisers:", error);
    throw error;
  }
}

/**
 * Fetch associated companies for an advertiser (if any)
 */
async function fetchAssociatedCompany(hubspotClient, advertiserId) {
  try {
    // Get associations to companies
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "2-40333244", // Advertisers object type
      advertiserId,
      "companies"
    );

    if (associations.results && associations.results.length > 0) {
      // Get the first associated company
      const companyId = associations.results[0].toObjectId;

      // Fetch company details
      const company = await hubspotClient.crm.companies.basicApi.getById(
        companyId,
        ['name', 'domain', 'country']
      );

      return {
        id: company.id,
        name: company.properties.name || 'Unnamed Company',
        domain: company.properties.domain || '',
        country: company.properties.country || ''
      };
    }

    return null;
  } catch (error) {
    console.warn(`⚠️ Could not fetch company for advertiser ${advertiserId}:`, error.message);
    return null;
  }
}

/**
 * Process advertiser data with company information
 */
async function processAdvertiserWithCompany(hubspotClient, advertiser, index) {
  // 🐛 DEBUG: Log the raw advertiser data structure
  console.log(`🔍 [DEBUG] Raw advertiser ${index + 1} data:`, {
    id: advertiser.id,
    properties: advertiser.properties,
    allPropertyKeys: Object.keys(advertiser.properties || {}),
    createdAt: advertiser.createdAt,
    updatedAt: advertiser.updatedAt
  });

  // 🐛 DEBUG: Try to identify all possible name fields
  const possibleNameFields = {
    advertiser: advertiser.properties.advertiser,           // 🎯 PRIMARY: Based on HubSpot UI column name
    name: advertiser.properties.name,
    advertiser_name: advertiser.properties.advertiser_name,
    title: advertiser.properties.title,
    label: advertiser.properties.label,
    display_name: advertiser.properties.display_name,
    company_name: advertiser.properties.company_name,
    brand_name: advertiser.properties.brand_name,
    client_name: advertiser.properties.client_name,
    account_name: advertiser.properties.account_name,
    business_name: advertiser.properties.business_name,
    organization_name: advertiser.properties.organization_name
  };

  // console.log($2

  // Filter out empty/null values and log non-empty ones
  const nonEmptyFields = Object.entries(possibleNameFields)
    .filter(([key, value]) => value && value.trim() !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  // console.log($2

  // Try common field names for advertiser name with priority order
  // 🎯 PRIORITY: "advertiser" field first (matches HubSpot UI column name)
  const name = advertiser.properties.advertiser ||           // 🎯 PRIMARY: HubSpot UI column name
    advertiser.properties.name ||
    advertiser.properties.advertiser_name ||
    advertiser.properties.title ||
    advertiser.properties.label ||
    advertiser.properties.display_name ||
    advertiser.properties.company_name ||
    advertiser.properties.brand_name ||
    advertiser.properties.client_name ||
    advertiser.properties.account_name ||
    advertiser.properties.business_name ||
    advertiser.properties.organization_name ||
    `Advertiser ${advertiser.id}`;

  const displayName = name && name.trim() !== '' ? name : `Advertiser ${advertiser.id}`;

  console.log(`✅ [DEBUG] Advertiser ${advertiser.id} final display name: "${displayName}" (from field: ${Object.entries(possibleNameFields).find(([key, value]) => value === name)?.[0] || 'fallback'
    })`);

  // Fetch associated company (optional for advertisers)
  const associatedCompany = await fetchAssociatedCompany(hubspotClient, advertiser.id);

  const result = {
    label: displayName,
    value: advertiser.id,
    name: displayName,
    company: associatedCompany?.name || '',
    companyId: associatedCompany?.id || null,
    hasCompany: !!associatedCompany,
    // Include additional advertiser properties that might be useful
    domain: advertiser.properties.domain || '',
    industry: advertiser.properties.industry || '',
    category: advertiser.properties.category || '',
    // 🐛 DEBUG: Include all properties for troubleshooting
    debugProperties: advertiser.properties
  };

  // console.log($2

  return result;
}

/**
 * Search advertisers by term (searches ALL advertisers)
 */
async function searchAdvertisers(hubspotClient, objectId, searchTerm) {
  // console.log($2

  try {
    // 🔧 FIX: First, get the schema to discover available properties
    let availableProperties = [];
    try {
      // console.log($2
      const schema = await hubspotClient.crm.schemas.coreApi.getById(objectId);
      availableProperties = schema.properties
        .filter(prop => !prop.name.startsWith('hs_')) // Filter out system properties
        .map(prop => prop.name);
      // console.log($2
    } catch (schemaError) {
      console.warn(`⚠️ [SCHEMA] Could not fetch schema:`, schemaError.message);
      // Fallback to common property names
      availableProperties = [
        'advertiser', 'name', 'title', 'label', 'advertiser_name',
        'brand_name', 'company_name', 'client_name', 'display_name'
      ];
      // console.log($2
    }

    // Now fetch more records for the actual search with discovered properties
    // console.log($2

    const advertisers = await hubspotClient.crm.objects.basicApi.getPage(
      objectId,
      100, // Fetch more records for search
      undefined,
      availableProperties.length > 0 ? availableProperties : undefined // Use discovered properties
    );

    // console.log($2

    if (!advertisers.results || advertisers.results.length === 0) {
      console.warn(`⚠️ [SEARCH] No advertisers found in object ${objectId}`);
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Advertiser", value: "" }],
          totalCount: 0,
          searchTerm: searchTerm,
          isSearchResult: true,
          hasMore: false,
          timestamp: Date.now()
        }
      };
    }

    // 🐛 DEBUG: Analyze what properties are available across all records
    const allPropertyKeys = new Set();
    advertisers.results.forEach(advertiser => {
      if (advertiser.properties) {
        Object.keys(advertiser.properties).forEach(key => allPropertyKeys.add(key));
      }
    });
    // console.log($2

    // Filter advertisers by search term (case-insensitive)
    // console.log($2

    const filteredAdvertisers = advertisers.results.filter((advertiser, index) => {
      const searchableFields = [
        advertiser.properties.advertiser,                    // 🎯 PRIMARY: HubSpot UI column name
        advertiser.properties.name,
        advertiser.properties.advertiser_name,
        advertiser.properties.title,
        advertiser.properties.label,
        advertiser.properties.display_name,
        advertiser.properties.company_name,
        advertiser.properties.brand_name,
        advertiser.properties.client_name,
        advertiser.properties.account_name,
        advertiser.properties.business_name,
        advertiser.properties.organization_name,
        advertiser.properties.domain
      ];

      console.log(`🔍 [DEBUG] Advertiser ${index + 1} (${advertiser.id}) searchable fields:`, {
        id: advertiser.id,
        searchableFields: searchableFields.filter(field => field && field.trim() !== ''),
        allProperties: Object.keys(advertiser.properties || {})
      });

      const matches = searchableFields.some(field =>
        field && field.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matches) {
        // console.log($2
      }

      return matches;
    });

    // console.log($2

    // Process each advertiser with company information
    // console.log($2

    const processedAdvertisers = await Promise.all(
      filteredAdvertisers.map((advertiser, index) => {
        // console.log($2
        return processAdvertiserWithCompany(hubspotClient, advertiser, index);
      })
    );

    // console.log($2

    // Sort by name
    processedAdvertisers.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Advertiser", value: "" },
      ...processedAdvertisers,
    ];

    console.log(`✅ [SEARCH] Final search results for "${searchTerm}":`, {
      totalMatches: processedAdvertisers.length,
      options: options.map(opt => ({ label: opt.label, value: opt.value }))
    });

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAdvertisers.length,
        searchTerm: searchTerm,
        isSearchResult: true,
        hasMore: false,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [SEARCH] Error in searchAdvertisers:`, error);
    throw error;
  }
}

/**
 * Get paginated advertisers for browsing
 */
async function getPaginatedAdvertisers(hubspotClient, objectId, page, limit) {
  // console.log($2

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // 🔧 FIX: Get the schema to discover available properties
    let availableProperties = [];
    try {
      // console.log($2
      const schema = await hubspotClient.crm.schemas.coreApi.getById(objectId);
      availableProperties = sgetPaginatedAdvertiserschema.properties
        .filter(prop => !prop.name.startsWith('hs_')) // Filter out system properties
        .map(prop => prop.name);
      // console.log($2
    } catch (schemaError) {
      console.warn(`⚠️ [SCHEMA] Could not fetch schema:`, schemaError.message);
      // Fallback to common property names
      availableProperties = [
        'advertiser', 'name', 'title', 'label', 'advertiser_name',
        'brand_name', 'company_name', 'client_name', 'display_name'
      ];
      // console.log($2
    }

    // console.log($2

    const advertisers = await hubspotClient.crm.objects.basicApi.getPage(
      objectId,
      Math.min(offset + limit, 100),
      undefined,
      availableProperties.length > 0 ? availableProperties : undefined // Use discovered properties
    );

    // console.log($2

    if (advertisers.results && advertisers.results.length > 0) {
      // console.log($2
    }

    // Slice the results for the requested page
    const paginatedResults = advertisers.results.slice(offset, offset + limit);
    // console.log($2

    // Process each advertiser with company information
    const processedAdvertisers = await Promise.all(
      paginatedResults.map((advertiser, index) => {
        // console.log($2
        return processAdvertiserWithCompany(hubspotClient, advertiser, index);
      })
    );

    processedAdvertisers.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Advertiser", value: "" },
      ...processedAdvertisers,
    ];

    const hasMore = advertisers.results.length > (offset + limit);

    // console.log($2
    // console.log($2

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAdvertisers.length,
        page: page,
        hasMore: hasMore,
        isPaginated: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [PAGINATE] Error in getPaginatedAdvertisers:`, error);
    throw error;
  }
}

/**
 * Get default advertisers (most recent/popular)
 */
async function getDefaultAdvertisers(hubspotClient, objectId, limit) {
  // console.log($2

  try {
    // console.log($2

    // 🔧 FIX: First, get the schema to discover available properties
    let availableProperties = [];
    try {
      // console.log($2
      const schema = await hubspotClient.crm.schemas.coreApi.getById(objectId);
      availableProperties = schema.properties
        .filter(prop => !prop.name.startsWith('hs_')) // Filter out system properties
        .map(prop => prop.name);
      // console.log($2
    } catch (schemaError) {
      console.warn(`⚠️ [SCHEMA] Could not fetch schema:`, schemaError.message);
      // Fallback to common property names
      availableProperties = [
        'advertiser', 'name', 'title', 'label', 'advertiser_name',
        'brand_name', 'company_name', 'client_name', 'display_name'
      ];
      // console.log($2
    }

    // 🔧 FIX: Request specific properties instead of empty array
    const advertisers = await hubspotClient.crm.objects.basicApi.getPage(
      objectId,
      limit,
      undefined,
      availableProperties.length > 0 ? availableProperties : undefined // Use discovered properties
    );

    // console.log($2

    if (!advertisers.results || advertisers.results.length === 0) {
      console.warn(`⚠️ [DEFAULT] No advertisers found in object ${objectId}`);
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Advertiser", value: "" }],
          totalCount: 0,
          totalAvailable: 0,
          hasMore: false,
          isDefault: true,
          timestamp: Date.now()
        }
      };
    }

    // 🐛 DEBUG: Show schema information for default load
    console.log(`🔍 [DEBUG] Default advertisers schema:`, {
      sampleProperties: advertisers.results[0]?.properties ? Object.keys(advertisers.results[0].properties) : 'No properties',
      totalResults: advertisers.results.length,
      requestedProperties: availableProperties
    });

    // Process each advertiser with company information
    // console.log($2

    const processedAdvertisers = await Promise.all(
      advertisers.results.map((advertiser, index) => {
        // console.log($2
        return processAdvertiserWithCompany(hubspotClient, advertiser, index);
      })
    );

    processedAdvertisers.sort((a, b) => a.label.localeCompare(b.label));

    const options = [
      { label: "Select Advertiser", value: "" },
      ...processedAdvertisers,
    ];

    const totalAvailable = advertisers.total || advertisers.results.length;
    const hasMore = totalAvailable > limit;

    // console.log($2
    // console.log($2

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedAdvertisers.length,
        totalAvailable: totalAvailable,
        hasMore: hasMore,
        isDefault: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [DEFAULT] Error in getDefaultAdvertisers:`, error);
    throw error;
  }
}