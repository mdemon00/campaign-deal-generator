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

    console.log('🔍 Contact Search Parameters:', { searchTerm, page, limit, loadAll, includeInactive });

    // Determine search strategy
    if (searchTerm && searchTerm.trim() !== "") {
      return await searchContacts(hubspotClient, searchTerm.trim(), includeInactive);
    } else if (loadAll) {
      return await getPaginatedContacts(hubspotClient, page, limit, includeInactive);
    } else {
      return await getDefaultContacts(hubspotClient, limit, includeInactive);
    }

  } catch (error) {
    console.error("❌ Error in contact search function:", error.message);
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
 * Process contact data into consistent format
 */
function processContactData(contact, index) {
  console.log(`🔍 [DEBUG] Raw contact ${index + 1} data:`, {
    id: contact.id,
    firstName: contact.properties.firstname,
    lastName: contact.properties.lastname,
    email: contact.properties.email,
    company: contact.properties.company,
    phone: contact.properties.phone
  });

  const firstName = contact.properties.firstname || '';
  const lastName = contact.properties.lastname || '';
  const email = contact.properties.email || '';
  const company = contact.properties.company || '';
  
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
    displayName = `Contact ${contact.id}`;
  }

  // Add email suffix if we have both name and email
  const fullDisplayName = (firstName || lastName) && email 
    ? `${displayName} (${email})`
    : displayName;

  // Add company if available
  const finalDisplayName = company 
    ? `${fullDisplayName} - ${company}`
    : fullDisplayName;

  console.log(`✅ [DEBUG] Contact ${contact.id} processed: "${finalDisplayName}"`);

  return {
    label: finalDisplayName,
    value: contact.id,
    firstName: firstName,
    lastName: lastName,
    email: email,
    company: company,
    phone: contact.properties.phone || '',
    displayName: displayName,
    fullDisplayName: finalDisplayName
  };
}

/**
 * Fetch contacts using standard Contacts API
 */
async function fetchContacts(hubspotClient, limit = 20, after = undefined, includeInactive = false) {
  console.log(`🔍 [API] Fetching contacts using standard Contacts API`);
  
  try {
    const properties = ['firstname', 'lastname', 'email', 'company', 'phone'];
    
    // ✅ FIXED: Use standard contacts API, not custom objects API
    const contacts = await hubspotClient.crm.contacts.basicApi.getPage(
      limit,
      after,
      properties,
      undefined, // propertiesWithHistory
      undefined, // associations
      !includeInactive // archived - false means get active contacts
    );

    console.log(`🔍 [API] Retrieved ${contacts.results?.length || 0} contacts`);

    return contacts;
  } catch (error) {
    console.error(`❌ [API] Error fetching contacts:`, error);
    throw error;
  }
}

/**
 * Search contacts by term
 */
async function searchContacts(hubspotClient, searchTerm, includeInactive) {
  console.log(`🔍 [SEARCH] Starting contact search for: "${searchTerm}"`);

  try {
    // Fetch contacts using standard contacts API
    const contactsData = await fetchContacts(hubspotClient, 100, undefined, includeInactive);

    if (!contactsData.results || contactsData.results.length === 0) {
      console.warn(`⚠️ [SEARCH] No contacts found in system`);
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Contact", value: "" }],
          totalCount: 0,
          searchTerm: searchTerm,
          isSearchResult: true,
          hasMore: false,
          timestamp: Date.now()
        }
      };
    }

    console.log(`🔍 [SEARCH] Found ${contactsData.results.length} total contacts, filtering by "${searchTerm}"`);

    // Filter contacts by search term (case-insensitive)
    const filteredContacts = contactsData.results.filter((contact, index) => {
      const searchableFields = [
        contact.properties.firstname,
        contact.properties.lastname,
        contact.properties.email,
        contact.properties.company,
        `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
        `${contact.properties.lastname || ''} ${contact.properties.firstname || ''}`.trim()
      ];

      const matches = searchableFields.some(field =>
        field && field.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matches) {
        console.log(`✅ [SEARCH] Contact ${contact.id} MATCHES search term "${searchTerm}"`);
      }

      return matches;
    });

    console.log(`🔍 [SEARCH] Filtered to ${filteredContacts.length} matching contacts`);

    // Process each contact
    const processedContacts = filteredContacts.map((contact, index) => {
      return processContactData(contact, index);
    });

    // Sort by display name
    processedContacts.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const options = [
      { label: "Select Contact", value: "" },
      ...processedContacts
    ];

    console.log(`✅ [SEARCH] Final search results for "${searchTerm}": ${processedContacts.length} matches`);

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedContacts.length,
        searchTerm: searchTerm,
        isSearchResult: true,
        hasMore: false,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [SEARCH] Error in searchContacts:`, error);
    throw error;
  }
}

/**
 * Get paginated contacts for browsing
 */
async function getPaginatedContacts(hubspotClient, page, limit, includeInactive) {
  console.log(`📄 [PAGINATE] Getting contact page ${page} with limit ${limit}`);

  try {
    const fetchLimit = Math.min(page * limit, 100);
    
    // Fetch contacts using standard contacts API
    const contactsData = await fetchContacts(hubspotClient, fetchLimit, undefined, includeInactive);

    if (!contactsData.results || contactsData.results.length === 0) {
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Contact", value: "" }],
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
    const paginatedResults = contactsData.results.slice(offset, offset + limit);
    console.log(`📄 [PAGINATE] Sliced to ${paginatedResults.length} results for page ${page}`);

    // Process each contact
    const processedContacts = paginatedResults.map((contact, index) => {
      return processContactData(contact, index);
    });

    processedContacts.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const options = [
      { label: "Select Contact", value: "" },
      ...processedContacts
    ];

    const hasMore = contactsData.results.length > (offset + limit);

    console.log(`✅ [PAGINATE] Returned page ${page}: ${processedContacts.length} contacts, hasMore: ${hasMore}`);

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedContacts.length,
        page: page,
        hasMore: hasMore,
        isPaginated: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [PAGINATE] Error in getPaginatedContacts:`, error);
    throw error;
  }
}

/**
 * Get default contacts
 */
async function getDefaultContacts(hubspotClient, limit, includeInactive) {
  console.log(`🏠 [DEFAULT] Getting default contacts (limit: ${limit})`);

  try {
    // Fetch contacts using standard contacts API
    const contactsData = await fetchContacts(hubspotClient, limit, undefined, includeInactive);

    if (!contactsData.results || contactsData.results.length === 0) {
      console.warn(`⚠️ [DEFAULT] No contacts found in system`);
      
      return {
        status: "SUCCESS",
        data: {
          options: [{ label: "Select Contact", value: "" }],
          totalCount: 0,
          totalAvailable: 0,
          hasMore: false,
          isDefault: true,
          timestamp: Date.now()
        }
      };
    }

    console.log(`🏠 [DEFAULT] Retrieved ${contactsData.results.length} default contacts`);

    // Process each contact
    const processedContacts = contactsData.results.map((contact, index) => {
      return processContactData(contact, index);
    });

    processedContacts.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const options = [
      { label: "Select Contact", value: "" },
      ...processedContacts
    ];

    // Check if there might be more contacts
    const hasMore = contactsData.results.length >= limit;

    console.log(`✅ [DEFAULT] Loaded ${processedContacts.length} default contacts, hasMore: ${hasMore}`);
    console.log(`🎯 [DEFAULT] Final processed contacts:`, processedContacts.map(c => ({ id: c.value, label: c.label })));

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: processedContacts.length,
        totalAvailable: processedContacts.length,
        hasMore: hasMore,
        isDefault: true,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error(`❌ [DEFAULT] Error in getDefaultContacts:`, error.message);
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