const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    console.log('🔍 Fetching Commercial Agreements...');

    const COMMERCIAL_AGREEMENTS_OBJECT_ID = "2-39552013";

    // Fetch commercial agreements with status field
    const agreements = await hubspotClient.crm.objects.basicApi.getPage(
      COMMERCIAL_AGREEMENTS_OBJECT_ID,
      50, // Limit to 50 for performance
      undefined,
      ['status'] // Use status field as agreement name
    );

    // Transform the data for dropdown options
    const agreementOptions = agreements.results
      .map((agreement, index) => {
        const status = agreement.properties.status;
        
        // Use status if available, otherwise use a fallback name
        const displayName = status && status.trim() !== '' 
          ? status 
          : `Agreement ${index + 1}`;
        
        return {
          label: displayName,
          value: agreement.id,
          company: '', // Will be populated when proper field names are added
          currency: '', // Will be populated when proper field names are added
          country: ''  // Will be populated when proper field names are added
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    // Add the default "Select" option at the beginning
    const options = [
      { label: "Select Commercial Agreement", value: "" },
      ...agreementOptions
    ];

    console.log(`✅ Successfully processed ${agreementOptions.length} commercial agreements`);

    return {
      status: "SUCCESS",
      data: {
        options: options,
        totalCount: agreementOptions.length,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error("❌ Error fetching commercial agreements:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};