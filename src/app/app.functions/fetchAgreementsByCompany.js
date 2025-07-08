const hubspot = require('@hubspot/api-client');

exports.main = async (context, sendResponse) => {
  console.log('🔍 [fetchAgreementsByCompany] Function started');
  
  try {
    const { companyId, limit = 50 } = context.parameters;
    
    if (!companyId || companyId.trim() === '') {
      console.log('❌ [fetchAgreementsByCompany] No company ID provided');
      return sendResponse({
        statusCode: 400,
        body: {
          status: 'ERROR',
          message: 'Company ID is required'
        }
      });
    }

    const hubspotClient = new hubspot.Client({
      accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN
    });

    console.log('🔍 [fetchAgreementsByCompany] Fetching agreements for company:', companyId);

    // Search for deals (commercial agreements) associated with the company
    const searchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'associations.company',
              operator: 'EQ',
              value: companyId
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

    const searchResponse = await hubspotClient.crm.deals.searchApi.doSearch(searchRequest);
    
    console.log('🔍 [fetchAgreementsByCompany] Search response:', {
      total: searchResponse.total,
      resultsCount: searchResponse.results?.length || 0
    });

    // Format results for UI
    const agreements = searchResponse.results.map(deal => {
      const properties = deal.properties;
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
        value: deal.id,
        label: label,
        dealName: dealName,
        dealStage: dealStage,
        amount: amount,
        currency: currency,
        closeDate: closeDate,
        companyId: companyId
      };
    });

    // Add default "Select Agreement" option
    const options = [
      { label: "Select Commercial Agreement", value: "" },
      ...agreements
    ];

    console.log('✅ [fetchAgreementsByCompany] Search completed successfully');
    console.log(`📊 [fetchAgreementsByCompany] Found ${agreements.length} agreements for company ${companyId}`);

    return sendResponse({
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: {
          data: {
            options: options,
            total: searchResponse.total,
            companyId: companyId
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ [fetchAgreementsByCompany] Error:', error);
    
    return sendResponse({
      statusCode: 500,
      body: {
        status: 'ERROR',
        message: `Failed to fetch agreements: ${error.message}`
      }
    });
  }
};