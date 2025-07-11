const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const {
      campaignDealId,
      campaignName,
      campaignType,
      commercialAgreement,
      advertiser,
      dealOwner,
      assignedCustomerService,
      contact,
      createdBy
    } = context.parameters;

    // console.log('💾 Saving Basic Information:', {
    //   campaignDealId,
    //   campaignName,
    //   commercialAgreement,
    //   advertiser,
    //   dealOwner,
    //   createdBy,
    //   timestamp: new Date().toISOString()
    // });

    // Step 1: Update Campaign Deal properties
    const updateProperties = {
      campaign_name: campaignName || '',
      campaign_type: campaignType || '',
      commercial_agreement_id: commercialAgreement || '',
      advertiser_id: advertiser || '',
      deal_owner_id: dealOwner || '', // This is a HubSpot User property
      deal_cs_id: assignedCustomerService || '', // Customer service representative
      contact_id: contact || '', // Contact association
      created_by: createdBy || '',
      basic_info_saved: 'Saved', // ✅ Fixed: Use 'Saved' with capital S
      basic_info_saved_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      last_modified_date: new Date().toISOString().split('T')[0]
    };

    // Remove empty values
    Object.keys(updateProperties).forEach(key => {
      if (updateProperties[key] === '') {
        delete updateProperties[key];
      }
    });

    // console.log($2

    // Update the Campaign Deal object with the new properties
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    await hubspotClient.crm.objects.basicApi.update(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      { properties: updateProperties }
    );

    // console.log($2

    // Step 2: Create/Update Association to Commercial Agreement
    if (commercialAgreement) {
      try {
        // console.log($2
        
        await hubspotClient.crm.associations.v4.basicApi.create(
          CAMPAIGN_DEAL_OBJECT_ID,
          campaignDealId,
          "2-39552013", // Commercial Agreements object ID
          commercialAgreement,
          [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }]
        );
        
        // console.log($2
      } catch (assocError) {
        console.warn('⚠️ Commercial Agreement association error (may already exist):', assocError.message);
      }
    }

    // Step 3: Create/Update Association to Advertiser
    if (advertiser) {
      try {
        // console.log($2
        
        await hubspotClient.crm.associations.v4.basicApi.create(
          CAMPAIGN_DEAL_OBJECT_ID,
          campaignDealId,
          "2-40333244", // Advertisers object ID
          advertiser,
          [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }]
        );
        
        // console.log($2
      } catch (assocError) {
        console.warn('⚠️ Advertiser association error (may already exist):', assocError.message);
      }
    }

    // Step 4: Fetch company and currency from Commercial Agreement (for immediate return)
    let companyInfo = { companyName: '', currency: '' };
    
    if (commercialAgreement) {
      try {
        // console.log($2
        companyInfo = await fetchCompanyFromAgreement(hubspotClient, commercialAgreement);
      } catch (error) {
        console.warn('⚠️ Could not fetch company info:', error.message);
      }
    }

    // Step 5: Fetch Deal Owner details (for immediate return)
    let dealOwnerInfo = { name: '', email: '' };
    
    if (dealOwner) {
      try {
        // console.log($2
        dealOwnerInfo = await fetchDealOwnerInfo(hubspotClient, dealOwner);
      } catch (error) {
        console.warn('⚠️ Could not fetch deal owner info:', error.message);
      }
    }

    // Step 6: Fetch Customer Service details (for immediate return)
    let customerServiceInfo = { name: '', email: '' };
    
    if (assignedCustomerService) {
      try {
        customerServiceInfo = await fetchDealOwnerInfo(hubspotClient, assignedCustomerService);
      } catch (error) {
        console.warn('⚠️ Could not fetch customer service info:', error.message);
      }
    }

    // console.log($2

    return {
      status: "SUCCESS",
      message: "Basic Information saved successfully! 🎉",
      data: {
        campaignDealId,
        savedAt: new Date().toISOString(),
        properties: updateProperties,
        companyInfo,
        dealOwnerInfo,
        customerServiceInfo,
        associations: {
          commercialAgreement: commercialAgreement || null,
          advertiser: advertiser || null,
          dealOwner: dealOwner || null,
          assignedCustomerService: assignedCustomerService || null
        }
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error saving Basic Information:", error);
    return {
      status: "ERROR",
      message: `Failed to save: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Fetch company information from Commercial Agreement association
 * 🔧 MODIFIED: Get currency from agreement's elegir_moneda instead of company
 */
async function fetchCompanyFromAgreement(hubspotClient, agreementId) {
  try {
    // 🔧 STEP 1: Get agreement with elegir_moneda field
    const agreement = await hubspotClient.crm.objects.basicApi.getById(
      "2-39552013", // Commercial Agreements object ID
      agreementId,
      ['elegir_moneda'] // Fetch the currency field from agreement
    );

    // 🔧 STEP 2: Get associated company from Commercial Agreement
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "2-39552013", // Commercial Agreements object type
      agreementId,
      "companies"
    );

    if (associations.results && associations.results.length > 0) {
      const companyId = associations.results[0].toObjectId;
      
      // Fetch company details
      const company = await hubspotClient.crm.companies.basicApi.getById(
        companyId,
        ['name', 'domain', 'country'] // Removed hs_additional_currencies
      );

      return {
        companyName: company.properties.name || 'Unknown Company',
        currency: agreement.properties.elegir_moneda || 'USD', // 🔧 FIXED: Use agreement currency
        domain: company.properties.domain || '',
        country: company.properties.country || ''
      };
    }

    // 🔧 STEP 3: If no company found, still return agreement currency
    return { 
      companyName: 'No company found', 
      currency: agreement.properties.elegir_moneda || 'USD' // 🔧 FIXED: Use agreement currency
    };
  } catch (error) {
    console.warn('⚠️ Error fetching company from agreement:', error.message);
    return { 
      companyName: 'Error loading company', 
      currency: '' 
    };
  }
}

/**
 * Fetch Deal Owner information using HubSpot Owners API
 */
async function fetchDealOwnerInfo(hubspotClient, ownerId) {
  try {
    // Fetch owner details using direct API call to /crm/v3/owners
    const response = await hubspotClient.apiRequest({
      method: 'GET',
      path: `/crm/v3/owners/${ownerId}`
    });

    const ownerData = await response.json();
    
    const firstName = ownerData.firstName || '';
    const lastName = ownerData.lastName || '';
    const email = ownerData.email || '';
    
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
      displayName = `Owner ${ownerId}`;
    }

    return {
      name: displayName,
      email: email,
      firstName: firstName,
      lastName: lastName
    };
  } catch (error) {
    console.warn('⚠️ Error fetching deal owner info:', error.message);
    return { name: `Owner ${ownerId}`, email: '' };
  }
}