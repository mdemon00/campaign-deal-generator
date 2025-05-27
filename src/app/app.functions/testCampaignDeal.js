const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    // Extract parameters from context
    const { objectId, objectType, testMessage } = context.parameters;
    
    console.log('🚀 Campaign Deal Test Function called with:', {
      objectId,
      objectType, 
      testMessage,
      timestamp: new Date().toISOString()
    });

    // Test HubSpot API connection
    let hubspotStatus = "Connected";
    try {
      // Try to get basic info about the object
      if (objectType === 'deals') {
        const deal = await hubspotClient.crm.deals.basicApi.getById(objectId, ['dealname', 'amount']);
        console.log('✅ Successfully retrieved deal:', deal.properties);
      } else if (objectType === 'companies') {
        const company = await hubspotClient.crm.companies.basicApi.getById(objectId, ['name', 'domain']);
        console.log('✅ Successfully retrieved company:', company.properties);
      }
    } catch (hubspotError) {
      console.warn('⚠️ HubSpot API test failed:', hubspotError.message);
      hubspotStatus = `API Error: ${hubspotError.message}`;
    }

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return comprehensive test results
    return {
      status: "SUCCESS",
      message: "Campaign Deal Generator test completed successfully! 🎉",
      data: {
        objectId: objectId,
        objectType: objectType,
        timestamp: Date.now(),
        testMessage: testMessage || "Hello from Campaign Deal Generator!",
        hubspotApiStatus: hubspotStatus,
        serverlessEnvironment: {
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsage: process.memoryUsage()
        },
        nextSteps: [
          "✅ Basic setup complete",
          "🔄 Ready for campaign deal form development",
          "📋 Line item management coming next",
          "🚀 HubSpot CRM integration ready"
        ]
      }
    };
    
  } catch (error) {
    console.error("❌ Error in testCampaignDeal function:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};
