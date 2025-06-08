const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const {
      campaignDealId,
      campaignType,
      taxId,
      businessName,
      dealCS,
      createdBy
    } = context.parameters;

    console.log('💾 Saving Campaign Details:', {
      campaignDealId,
      campaignType,
      taxId,
      businessName,
      dealCS,
      createdBy,
      timestamp: new Date().toISOString()
    });

    // Step 1: Update Campaign Deal properties
    const updateProperties = {
      campaign_type: campaignType || '',
      tax_id: taxId || '',
      business_name: businessName || '',
      deal_cs_id: dealCS || '', // This is a HubSpot User property (same as deal_owner_id)
      campaign_details_saved: 'Saved', // ✅ Use 'Saved' with capital S (same as basic info)
      campaign_details_saved_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      last_modified_date: new Date().toISOString().split('T')[0]
    };

    // Remove empty values
    Object.keys(updateProperties).forEach(key => {
      if (updateProperties[key] === '') {
        delete updateProperties[key];
      }
    });

    console.log('🔄 Updating Campaign Deal properties:', updateProperties);

    // Update the Campaign Deal object with the new properties
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    await hubspotClient.crm.objects.basicApi.update(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      { properties: updateProperties }
    );

    console.log('✅ Campaign Deal properties updated successfully');

    // Step 2: Fetch Deal CS details (for immediate return) - Reuse Deal Owner function
    let dealCSInfo = { name: '', email: '' };
    
    if (dealCS) {
      try {
        console.log('👤 Fetching Deal CS info...');
        dealCSInfo = await fetchDealOwnerInfo(hubspotClient, dealCS); // ✅ Reuse existing function
      } catch (error) {
        console.warn('⚠️ Could not fetch deal CS info:', error.message);
      }
    }

    console.log('🎉 Campaign Details saved successfully!');

    return {
      status: "SUCCESS",
      message: "Campaign Details saved successfully! 🎉",
      data: {
        campaignDealId,
        savedAt: new Date().toISOString(),
        properties: updateProperties,
        dealCSInfo,
        campaignDetails: {
          campaignType: campaignType || '',
          taxId: taxId || '',
          businessName: businessName || '',
          dealCS: dealCS || ''
        }
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error saving Campaign Details:", error);
    return {
      status: "ERROR",
      message: `Failed to save: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Fetch Deal Owner/CS information using HubSpot Owners API
 * ✅ Reused from saveBasicInformation.js - no duplication
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
    console.warn('⚠️ Error fetching deal owner/CS info:', error.message);
    return { name: `Owner ${ownerId}`, email: '' };
  }
}