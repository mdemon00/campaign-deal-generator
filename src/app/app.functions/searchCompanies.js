const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  console.log('🔍 [searchCompanies] Function started');
  
  try {
    const { searchTerm, limit = 50, page = 1 } = context.parameters;
    
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('❌ [searchCompanies] No search term provided');
      return {
        status: 'ERROR',
        message: 'Search term is required'
      };
    }

    const hubspotClient = new hubspot.Client({
      accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN
    });

    // Search companies using the search API
    const searchRequest = {
      query: searchTerm.trim(),
      limit: parseInt(limit),
      after: page > 1 ? (page - 1) * limit : 0,
      sorts: [
        {
          propertyName: 'name',
          direction: 'ASCENDING'
        }
      ],
      properties: [
        'name',
        'domain',
        'country',
        'city',
        'hs_object_id'
      ]
    };

    console.log('🔍 [searchCompanies] Searching with request:', searchRequest);

    const searchResponse = await hubspotClient.crm.companies.searchApi.doSearch(searchRequest);
    
    console.log('🔍 [searchCompanies] Search response:', {
      total: searchResponse.total,
      resultsCount: searchResponse.results?.length || 0
    });

    // Format results for UI
    const companies = searchResponse.results.map(company => {
      try {
        const properties = company.properties || {};
        const companyName = properties.name || 'Unnamed Company';
        const domain = properties.domain || '';
        const country = properties.country || '';
        const city = properties.city || '';
        
        // Create display label
        let label = companyName;
        if (domain) label += ` (${domain})`;
        if (city || country) {
          const location = [city, country].filter(Boolean).join(', ');
          if (location) label += ` - ${location}`;
        }
        
        return {
          value: company.id || '',
          label: label,
          companyName: companyName,
          domain: domain,
          country: country,
          city: city
        };
      } catch (error) {
        console.error('❌ [searchCompanies] Error formatting company:', error, company);
        return {
          value: company.id || '',
          label: 'Error formatting company',
          companyName: 'Error',
          domain: '',
          country: '',
          city: ''
        };
      }
    });

    // Add default "Select Company" option
    const options = [
      { label: "Select Company", value: "" },
      ...companies
    ];

    const hasMore = searchResponse.paging && searchResponse.paging.next && searchResponse.paging.next.after ? true : false;

    console.log('✅ [searchCompanies] Search completed successfully');
    console.log(`📊 [searchCompanies] Found ${companies.length} companies`);

    return {
      status: 'SUCCESS',
      data: {
        options: options,
        hasMore: hasMore,
        total: searchResponse.total,
        searchTerm: searchTerm
      }
    };

  } catch (error) {
    console.error('❌ [searchCompanies] Error:', error);
    
    return {
      status: 'ERROR',
      message: `Company search failed: ${error.message}`
    };
  }
};