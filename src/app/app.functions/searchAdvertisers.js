// src/app/app.functions/searchAdvertisers.js
// FIXED: Auto-population issue for advertiser country and company

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
      selectedAdvertiserId = "" // 🔧 NEW: Support for fetching specific advertiser
    } = context.parameters;

    const ADVERTISERS_OBJECT_ID = "2-40333244";

    // 🔧 NEW: Handle specific advertiser lookup
    if (selectedAdvertiserId && selectedAdvertiserId.trim() !== "") {
      return await getSpecificAdvertiser(hubspotClient, ADVERTISERS_OBJECT_ID, selectedAdvertiserId.trim());
    } else if (searchTerm && searchTerm.trim() !== "") {
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
    return null;
  }
}

/**
 * Process advertiser data with company information
 * 🔧 FIXED: Return correct property names for auto-population
 */
async function processAdvertiserWithCompany(hubspotClient, advertiser, index) {
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

  const associatedCompany = await fetchAssociatedCompany(hubspotClient, advertiser.id);

  return {
    label: displayName,
    value: advertiser.id,
    name: displayName,
    
    // 🔧 FIXED: Use 'companyName' instead of 'company' to match BasicInformation.jsx
    companyName: associatedCompany?.name || '',
    companyId: associatedCompany?.id || null,
    hasCompany: !!associatedCompany,
    
    // 🔧 FIXED: Add 'country' property from advertiser properties or company
    country: advertiser.properties.country || associatedCompany?.country || '',
    
    // Keep existing properties
    domain: advertiser.properties.domain || '',
    industry: advertiser.properties.industry || '',
    category: advertiser.properties.category || ''
  };
}

/**
 * Get specific advertiser by ID
 * 🔧 NEW: Function to fetch a specific advertiser for auto-population
 */
async function getSpecificAdvertiser(hubspotClient, objectId, advertiserId) {
  try {
    const availableProperties = await getCustomProperties(hubspotClient, objectId);

    // Fetch the specific advertiser
    const advertiser = await hubspotClient.crm.objects.basicApi.getById(
      objectId,
      advertiserId,
      availableProperties.length > 0 ? availableProperties : undefined
    );

    // Process the advertiser
    const processedAdvertiser = await processAdvertiserWithCompany(hubspotClient, advertiser, 0);

    const options = [
      { label: "Select Advertiser", value: "" },
      processedAdvertiser
    ];

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: 1,
        selectedAdvertiserId: advertiserId,
        isSpecificResult: true,
        hasMore: false,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [SPECIFIC] Error fetching advertiser ${advertiserId}:`, error);
    
    // Return empty result if advertiser not found
    return {
      status: "SUCCESS",
      data: {
        options: [{ label: "Select Advertiser", value: "" }],
        totalCount: 0,
        selectedAdvertiserId: advertiserId,
        isSpecificResult: true,
        hasMore: false,
        error: `Advertiser ${advertiserId} not found`,
        timestamp: Date.now()
      }
    };
  }
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
    return [
      'advertiser', 'name', 'title', 'label', 'advertiser_name', 
      'brand_name', 'company_name', 'client_name', 'display_name',
      'country', 'domain' // 🔧 FIXED: Include country and domain in fallback
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
      ...processedAdvertisers,
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