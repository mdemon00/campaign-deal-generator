const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  console.log('🔍 [fetchAgreementsByCompany] Function started');
  
  try {
    const { companyId, limit = 50 } = context.parameters;
    
    if (!companyId || companyId.trim() === '') {
      console.log('❌ [fetchAgreementsByCompany] No company ID provided');
      return {
        status: 'ERROR',
        message: 'Company ID is required'
      };
    }

    const hubspotClient = new hubspot.Client({
      accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN
    });

    console.log('🔍 [fetchAgreementsByCompany] Fetching agreements for company:', companyId);

    // First, get associated deals using the associations API
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "companies",
      companyId,
      "deals"
    );

    console.log('🔍 [fetchAgreementsByCompany] Found associations:', {
      total: associations.results?.length || 0,
      dealIds: associations.results?.map(a => a.toObjectId) || []
    });

    let searchResponse;
    
    if (!associations.results || associations.results.length === 0) {
      console.log('🔍 [fetchAgreementsByCompany] No associated deals found for company');
      searchResponse = { results: [], total: 0 };
    } else {
      // Get the deal IDs
      const dealIds = associations.results.map(association => association.toObjectId);
      
      console.log('🔍 [fetchAgreementsByCompany] Getting deal details for IDs:', dealIds);

      // Now search for deals that are commercial agreements
      const searchRequest = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'hs_object_id',
                operator: 'IN',
                values: dealIds
              },
              {
                propertyName: 'dealtype',
                operator: 'EQ',
                value: 'commercial_agreement'
              }
            ]
          }
        ],
        limit: parseInt(limit),
        sorts: [
          {
            propertyName: 'dealname',
            direction: 'ASCENDING'
          }
        ],
        properties: [
          'dealname',
          'dealstage',
          'amount',
          'closedate',
          'createdate',
          'hs_object_id',
          'currency_code',
          'dealtype'
        ]
      };

      console.log('🔍 [fetchAgreementsByCompany] Search request:', searchRequest);

      searchResponse = await hubspotClient.crm.deals.searchApi.doSearch(searchRequest);
    }
    
    console.log('🔍 [fetchAgreementsByCompany] Search response:', {
      total: searchResponse.total,
      resultsCount: searchResponse.results?.length || 0
    });

    // Format results for UI
    const agreements = searchResponse.results.map(deal => {
      try {
        const properties = deal.properties || {};
        const dealName = properties.dealname || 'Unnamed Agreement';
        const dealStage = properties.dealstage || '';
        const amount = properties.amount || '';
        const currency = properties.currency_code || '';
        const closeDate = properties.closedate || '';
        
        // Create display label
        let label = dealName;
        if (amount && currency) {
          label += ` (${amount} ${currency})`;
        }
        if (dealStage) {
          label += ` - ${dealStage}`;
        }
        
        return {
          value: deal.id || '',
          label: label,
          dealName: dealName,
          dealStage: dealStage,
          amount: amount,
          currency: currency,
          closeDate: closeDate,
          companyId: companyId
        };
      } catch (error) {
        console.error('❌ [fetchAgreementsByCompany] Error formatting deal:', error, deal);
        return {
          value: deal.id || '',
          label: 'Error formatting agreement',
          dealName: 'Error',
          dealStage: '',
          amount: '',
          currency: '',
          closeDate: '',
          companyId: companyId
        };
      }
    });

    // Add default "Select Agreement" option
    const options = [
      { label: "Select Commercial Agreement", value: "" },
      ...agreements
    ];

    console.log('✅ [fetchAgreementsByCompany] Search completed successfully');
    console.log(`📊 [fetchAgreementsByCompany] Found ${agreements.length} agreements for company ${companyId}`);

    return {
      status: 'SUCCESS',
      data: {
        options: options,
        total: searchResponse.total,
        companyId: companyId
      }
    };

  } catch (error) {
    console.error('❌ [fetchAgreementsByCompany] Error:', error);
    
    return {
      status: 'ERROR',
      message: `Failed to fetch agreements: ${error.message}`
    };
  }
};