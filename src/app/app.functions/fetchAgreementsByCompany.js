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

    const COMMERCIAL_AGREEMENTS_OBJECT_ID = "2-39552013";

    // First, get associated commercial agreements using the associations API
    const associations = await hubspotClient.crm.associations.v4.basicApi.getPage(
      "companies",
      companyId,
      COMMERCIAL_AGREEMENTS_OBJECT_ID
    );

    console.log('🔍 [fetchAgreementsByCompany] Found associations:', {
      total: associations.results?.length || 0,
      agreementIds: associations.results?.map(a => a.toObjectId) || []
    });

    let searchResponse;
    
    if (!associations.results || associations.results.length === 0) {
      console.log('🔍 [fetchAgreementsByCompany] No associated commercial agreements found for company');
      searchResponse = { results: [], total: 0 };
    } else {
      // Get the commercial agreement IDs
      const agreementIds = associations.results.map(association => association.toObjectId);
      
      console.log('🔍 [fetchAgreementsByCompany] Getting agreement details for IDs:', agreementIds);

      // Get all the commercial agreements by their IDs
      const agreementPromises = agreementIds.map(async (agreementId) => {
        try {
          const agreement = await hubspotClient.crm.objects.basicApi.getById(
            COMMERCIAL_AGREEMENTS_OBJECT_ID,
            agreementId,
            [
              'status',
              'estado',
              'monto',
              'fecha_de_inicio',
              'fecha_de_finalizacion',
              'moneda',
              'hs_object_id'
            ]
          );
          
          console.log(`🔍 [fetchAgreementsByCompany] Agreement ${agreementId} details:`, {
            id: agreement.id,
            properties: agreement.properties,
            availableProperties: Object.keys(agreement.properties || {})
          });
          
          return agreement;
        } catch (error) {
          console.error(`❌ Error fetching agreement ${agreementId}:`, error);
          return null;
        }
      });

      const agreements = await Promise.all(agreementPromises);
      const validAgreements = agreements.filter(agreement => agreement !== null);

      searchResponse = { 
        results: validAgreements, 
        total: validAgreements.length 
      };
    }
    
    console.log('🔍 [fetchAgreementsByCompany] Search response:', {
      total: searchResponse.total,
      resultsCount: searchResponse.results?.length || 0
    });

    // Format results for UI
    const agreements = searchResponse.results.map(agreement => {
      try {
        const properties = agreement.properties || {};
        const agreementName = properties.status || 'Unnamed Agreement';
        const estado = properties.estado || '';
        const amount = properties.monto || '';
        const currency = properties.moneda || '';
        const startDate = properties.fecha_de_inicio || '';
        const endDate = properties.fecha_de_finalizacion || '';
        
        console.log(`🔍 [fetchAgreementsByCompany] Agreement ${agreement.id} properties:`, {
          status: properties.status,
          moneda: properties.moneda,
          monto: properties.monto,
          allProperties: Object.keys(properties)
        });
        
        // Create display label
        let label = agreementName;
        if (amount && currency) {
          label += ` (${amount} ${currency})`;
        }
        if (estado) {
          label += ` - ${estado}`;
        }
        
        return {
          value: agreement.id || '',
          label: label,
          dealName: agreementName,
          dealStage: estado,
          amount: amount,
          currency: currency,
          startDate: startDate,
          endDate: endDate,
          companyId: companyId
        };
      } catch (error) {
        console.error('❌ [fetchAgreementsByCompany] Error formatting agreement:', error, agreement);
        return {
          value: agreement.id || '',
          label: 'Error formatting agreement',
          dealName: 'Error',
          dealStage: '',
          amount: '',
          currency: '',
          startDate: '',
          endDate: '',
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
    console.log('📋 [fetchAgreementsByCompany] Agreement details:', agreements.map(a => ({
      id: a.value,
      label: a.label,
      currency: a.currency
    })));

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