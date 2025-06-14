const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { campaignDealId } = context.parameters;

    console.log('📖 Loading Basic Information for Campaign Deal:', campaignDealId);

    // Step 1: Fetch Campaign Deal properties
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    const campaignDeal = await hubspotClient.crm.objects.basicApi.getById(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      [
        'campaign_name',
        'commercial_agreement_id', 
        'advertiser_id',
        'deal_owner_id',
        'created_by',
        'basic_info_saved',
        'basic_info_saved_date',
        'last_modified_date'
      ]
    );

    const properties = campaignDeal.properties;
    const saveStatus = properties.basic_info_saved || 'not_saved';

    console.log('📋 Campaign Deal properties loaded:', {
      saveStatus,
      campaignName: properties.campaign_name,
      commercialAgreement: properties.commercial_agreement_id,
      advertiser: properties.advertiser_id,
      dealOwner: properties.deal_owner_id
    });

    // Step 2: Load Commercial Agreement details (if saved)
    let commercialAgreementInfo = null;
    let companyInfo = { companyName: '', currency: '' };
    
    if (properties.commercial_agreement_id) {
      try {
        console.log('🔍 Loading Commercial Agreement details...');
        
        // Get the agreement details
        const agreement = await hubspotClient.crm.objects.basicApi.getById(
          "2-39552013", // Commercial Agreements object ID
          properties.commercial_agreement_id,
          ['status']
        );

        commercialAgreementInfo = {
          id: properties.commercial_agreement_id,
          label: agreement.properties.status || `Agreement ${properties.commercial_agreement_id}`,
          value: properties.commercial_agreement_id
        };

        // Fetch company info from Commercial Agreement
        companyInfo = await fetchCompanyFromAgreement(hubspotClient, properties.commercial_agreement_id);
        
        console.log('✅ Commercial Agreement loaded:', commercialAgreementInfo);
        console.log('🏢 Company info loaded:', companyInfo);
        
      } catch (error) {
        console.warn('⚠️ Could not load Commercial Agreement details:', error.message);
        commercialAgreementInfo = {
          id: properties.commercial_agreement_id,
          label: `Agreement ${properties.commercial_agreement_id}`,
          value: properties.commercial_agreement_id
        };
      }
    }

    // Step 3: Load Advertiser details (if saved)
    let advertiserInfo = null;
    
    if (properties.advertiser_id) {
      try {
        console.log('🔍 Loading Advertiser details...');
        
        // Get advertiser details - try common property names
        const advertiser = await hubspotClient.crm.objects.basicApi.getById(
          "2-40333244", // Advertisers object ID
          properties.advertiser_id,
          ['advertiser', 'name', 'title', 'label']
        );

        const advertiserName = advertiser.properties.advertiser ||
                              advertiser.properties.name ||
                              advertiser.properties.title ||
                              advertiser.properties.label ||
                              `Advertiser ${properties.advertiser_id}`;

        advertiserInfo = {
          id: properties.advertiser_id,
          label: advertiserName,
          value: properties.advertiser_id
        };
        
        console.log('✅ Advertiser loaded:', advertiserInfo);
        
      } catch (error) {
        console.warn('⚠️ Could not load Advertiser details:', error.message);
        advertiserInfo = {
          id: properties.advertiser_id,
          label: `Advertiser ${properties.advertiser_id}`,
          value: properties.advertiser_id
        };
      }
    }

    // Step 4: Load Deal Owner details (if saved) - Using HubSpot Owners API
    let dealOwnerInfo = null;
    
    if (properties.deal_owner_id) {
      try {
        console.log('🔍 Loading Deal Owner details...');
        
        // Fetch owner details using HubSpot Owners API
        const response = await hubspotClient.apiRequest({
          method: 'GET',
          path: `/crm/v3/owners/${properties.deal_owner_id}`
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
          displayName = `Owner ${properties.deal_owner_id}`;
        }

        // Add email suffix if we have both name and email
        const fullDisplayName = (firstName || lastName) && email 
          ? `${displayName} (${email})`
          : displayName;

        dealOwnerInfo = {
          id: properties.deal_owner_id,
          label: fullDisplayName,
          value: properties.deal_owner_id,
          displayName: displayName,
          email: email
        };
        
        console.log('✅ Deal Owner loaded:', dealOwnerInfo);
        
      } catch (error) {
        console.warn('⚠️ Could not load Deal Owner details:', error.message);
        dealOwnerInfo = {
          id: properties.deal_owner_id,
          label: `Owner ${properties.deal_owner_id}`,
          value: properties.deal_owner_id
        };
      }
    }

    // Step 5: Prepare form data
    const formData = {
      campaignName: properties.campaign_name || '',
      commercialAgreement: properties.commercial_agreement_id || '',
      company: companyInfo.companyName || '',
      advertiser: properties.advertiser_id || '',
      dealOwner: properties.deal_owner_id || '',
      currency: companyInfo.currency || '',
      // Additional context
      createdBy: properties.created_by || '',
      saveStatus: saveStatus,
      lastSaved: properties.basic_info_saved_date || null,
      lastModified: properties.last_modified_date || null
    };

    console.log('🎉 Basic Information loaded successfully!');

    return {
      status: "SUCCESS",
      message: saveStatus === 'Saved' ? "✅ Saved data loaded successfully!" : "📝 Ready to fill basic information", // ✅ Fixed: Capital S
      data: {
        formData,
        saveStatus,
        associations: {
          commercialAgreement: commercialAgreementInfo,
          advertiser: advertiserInfo,
          dealOwner: dealOwnerInfo
        },
        companyInfo,
        metadata: {
          campaignDealId,
          lastSaved: properties.basic_info_saved_date,
          lastModified: properties.last_modified_date,
          loadedAt: new Date().toISOString()
        }
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error loading Basic Information:", error);
    
    // Return empty form data on error so UI can still function
    return {
      status: "ERROR",
      message: `Failed to load: ${error.message}`,
      data: {
        formData: {
          campaignName: '',
          commercialAgreement: '',
          company: '',
          advertiser: '',
          dealOwner: '',
          currency: ''
        },
        saveStatus: 'not_saved',
        associations: {},
        companyInfo: { companyName: '', currency: '' }
      },
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Fetch company information from Commercial Agreement association
 */
async function fetchCompanyFromAgreement(hubspotClient, agreementId) {
  try {
    // Get associated company from Commercial Agreement
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
        ['name', 'hs_additional_currencies', 'domain', 'country']
      );

      return {
        companyName: company.properties.name || 'Unknown Company',
        currency: company.properties.hs_additional_currencies || 'USD',
        domain: company.properties.domain || '',
        country: company.properties.country || ''
      };
    }

    return { companyName: 'No company found', currency: '' };
  } catch (error) {
    console.warn('⚠️ Error fetching company from agreement:', error.message);
    return { companyName: 'Error loading company', currency: '' };
  }
}