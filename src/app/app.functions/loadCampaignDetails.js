const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { campaignDealId } = context.parameters;

    // console.log($2

    // Step 1: Fetch Campaign Deal properties
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    const campaignDeal = await hubspotClient.crm.objects.basicApi.getById(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      [
        'campaign_type',
        'tax_id', 
        'business_name',
        'deal_cs_id',
        'campaign_details_saved',
        'campaign_details_saved_date',
        'last_modified_date'
      ]
    );

    const properties = campaignDeal.properties;
    const saveStatus = properties.campaign_details_saved || 'not_saved';

    // console.log('📋 Campaign Detail properties loaded:', {
    //   saveStatus,
    //   campaignType: properties.campaign_type,
    //   taxId: properties.tax_id,
    //   businessName: properties.business_name,
    //   dealCS: properties.deal_cs_id
    // });

    // Step 2: Load Deal CS details (if saved) - Reuse Deal Owner function
    let dealCSInfo = null;
    
    if (properties.deal_cs_id) {
      try {
        // console.log($2
        
        // Fetch Deal CS details using HubSpot Owners API (same as Deal Owner)
        const response = await hubspotClient.apiRequest({
          method: 'GET',
          path: `/crm/v3/owners/${properties.deal_cs_id}`
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
          displayName = `CS Rep ${properties.deal_cs_id}`;
        }

        // Add email suffix if we have both name and email
        const fullDisplayName = (firstName || lastName) && email 
          ? `${displayName} (${email})`
          : displayName;

        dealCSInfo = {
          id: properties.deal_cs_id,
          label: fullDisplayName,
          value: properties.deal_cs_id,
          displayName: displayName,
          email: email
        };
        
        // console.log($2
        
      } catch (error) {
        console.warn('⚠️ Could not load Deal CS details:', error.message);
        dealCSInfo = {
          id: properties.deal_cs_id,
          label: `CS Rep ${properties.deal_cs_id}`,
          value: properties.deal_cs_id
        };
      }
    }

    // Step 3: Prepare form data
    const formData = {
      campaignType: properties.campaign_type || '',
      taxId: properties.tax_id || '',
      businessName: properties.business_name || '',
      dealCS: properties.deal_cs_id || '',
      // Additional context
      saveStatus: saveStatus,
      lastSaved: properties.campaign_details_saved_date || null,
      lastModified: properties.last_modified_date || null
    };

    // console.log($2

    return {
      status: "SUCCESS",
      message: saveStatus === 'Saved' ? "✅ Saved campaign details loaded successfully!" : "📝 Ready to fill campaign details",
      data: {
        formData,
        saveStatus,
        associations: {
          dealCS: dealCSInfo
        },
        metadata: {
          campaignDealId,
          lastSaved: properties.campaign_details_saved_date,
          lastModified: properties.last_modified_date,
          loadedAt: new Date().toISOString()
        }
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error loading Campaign Details:", error);
    
    // Return empty form data on error so UI can still function
    return {
      status: "ERROR",
      message: `Failed to load: ${error.message}`,
      data: {
        formData: {
          campaignType: '',
          taxId: '',
          businessName: '',
          dealCS: ''
        },
        saveStatus: 'not_saved',
        associations: {},
        metadata: {}
      },
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};