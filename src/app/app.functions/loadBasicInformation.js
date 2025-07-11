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
        'campaign_name',
        'campaign_type',
        'commercial_agreement_id', 
        'advertiser_id',
        'deal_owner_id',
        'deal_cs_id',
        'contact_id',
        'created_by',
        'basic_info_saved',
        'basic_info_saved_date',
        'last_modified_date',
        'hs_updated_by_user_id',
        'hs_lastmodifieddate'
      ]
    );

    const properties = campaignDeal.properties;
    const saveStatus = properties.basic_info_saved || 'not_saved';

    // console.log('📋 Campaign Deal properties loaded:', {
    //   saveStatus,
    //   campaignName: properties.campaign_name,
    //   commercialAgreement: properties.commercial_agreement_id,
    //   advertiser: properties.advertiser_id,
    //   dealOwner: properties.deal_owner_id
    // });

    // Step 2: Load Commercial Agreement details (if saved)
    let commercialAgreementInfo = null;
    let companyInfo = { companyName: '', currency: '' };
    
    if (properties.commercial_agreement_id) {
      try {
        // console.log($2
        
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
        
        // console.log($2
        // console.log($2
        
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
        // console.log($2
        
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
        
        // console.log($2
        
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
        // console.log($2
        
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
        
        // console.log($2
        
      } catch (error) {
        console.warn('⚠️ Could not load Deal Owner details:', error.message);
        dealOwnerInfo = {
          id: properties.deal_owner_id,
          label: `Owner ${properties.deal_owner_id}`,
          value: properties.deal_owner_id
        };
      }
    }

    // Step 5: Load Customer Service details (if saved) - Using HubSpot Owners API
    let customerServiceInfo = null;
    
    if (properties.deal_cs_id) {
      try {
        // console.log($2
        
        // Fetch customer service details using HubSpot Owners API
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

        customerServiceInfo = {
          id: properties.deal_cs_id,
          label: fullDisplayName,
          value: properties.deal_cs_id,
          displayName: displayName,
          email: email
        };
        
        // console.log($2
        
      } catch (error) {
        console.warn('⚠️ Could not load Customer Service details:', error.message);
        customerServiceInfo = {
          id: properties.deal_cs_id,
          label: `CS Rep ${properties.deal_cs_id}`,
          value: properties.deal_cs_id
        };
      }
    }

    // Step 6: Load Contact details (if saved) - Using HubSpot Contacts API
    let contactInfo = null;
    
    if (properties.contact_id) {
      try {
        // Fetch contact details using HubSpot Contacts API
        const response = await hubspotClient.apiRequest({
          method: 'GET',
          path: `/crm/v3/objects/contacts/${properties.contact_id}`,
          qs: {
            properties: 'firstname,lastname,email,company,phone'
          }
        });

        const contactData = await response.json();
        
        const firstName = contactData.properties.firstname || '';
        const lastName = contactData.properties.lastname || '';
        const email = contactData.properties.email || '';
        const company = contactData.properties.company || '';
        
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
          displayName = `Contact ${properties.contact_id}`;
        }

        // Add email suffix if we have both name and email
        const fullDisplayName = (firstName || lastName) && email 
          ? `${displayName} (${email})`
          : displayName;

        // Add company if available
        const finalDisplayName = company 
          ? `${fullDisplayName} - ${company}`
          : fullDisplayName;

        contactInfo = {
          id: properties.contact_id,
          label: finalDisplayName,
          value: properties.contact_id,
          displayName: displayName,
          email: email,
          company: company
        };
        
      } catch (error) {
        console.warn('⚠️ Could not load Contact details:', error.message);
        contactInfo = {
          id: properties.contact_id,
          label: `Contact ${properties.contact_id}`,
          value: properties.contact_id
        };
      }
    }

    // Step 7: Load Updated By User details (if available) - Using HubSpot Owners API
    let updatedByUserInfo = null;
    
    // Always include lastModifiedDate if available
    if (properties.hs_lastmodifieddate) {
      updatedByUserInfo = {
        lastModifiedDate: properties.hs_lastmodifieddate
      };
    }
    
    if (properties.hs_updated_by_user_id) {
      try {
        // Fetch updated by user details using HubSpot Owners API
        const response = await hubspotClient.apiRequest({
          method: 'GET',
          path: `/crm/v3/owners/${properties.hs_updated_by_user_id}`
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
          displayName = `User ${properties.hs_updated_by_user_id}`;
        }

        updatedByUserInfo = {
          ...updatedByUserInfo,
          id: properties.hs_updated_by_user_id,
          displayName: displayName,
          email: email
        };
        
      } catch (error) {
        console.warn('⚠️ Could not load Updated By User details:', error.message);
        updatedByUserInfo = {
          ...updatedByUserInfo,
          id: properties.hs_updated_by_user_id,
          displayName: `User ${properties.hs_updated_by_user_id}`,
          email: ''
        };
      }
    }

    // Step 8: Prepare form data
    const formData = {
      campaignName: properties.campaign_name || '',
      campaignType: properties.campaign_type || '',
      commercialAgreement: properties.commercial_agreement_id || '',
      company: companyInfo.companyName || '',
      advertiser: properties.advertiser_id || '',
      dealOwner: properties.deal_owner_id || '',
      assignedCustomerService: properties.deal_cs_id || '',
      contact: properties.contact_id || '',
      currency: companyInfo.currency || '',
      // Additional context
      createdBy: properties.created_by || '',
      saveStatus: saveStatus,
      lastSaved: properties.basic_info_saved_date || null,
      lastModified: properties.last_modified_date || null
    };

    // console.log($2

    return {
      status: "SUCCESS",
      message: saveStatus === 'Saved' ? "✅ Saved data loaded successfully!" : "📝 Ready to fill basic information", // ✅ Fixed: Capital S
      data: {
        formData,
        saveStatus,
        associations: {
          commercialAgreement: commercialAgreementInfo,
          advertiser: advertiserInfo,
          dealOwner: dealOwnerInfo,
          assignedCustomerService: customerServiceInfo,
          contact: contactInfo,
          updatedByUser: updatedByUserInfo
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
          campaignType: '',
          commercialAgreement: '',
          company: '',
          advertiser: '',
          dealOwner: '',
          assignedCustomerService: '',
          contact: '',
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