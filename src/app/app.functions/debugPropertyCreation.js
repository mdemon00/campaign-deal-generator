const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    console.log('🐛 Starting Property Creation Debug...');

    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    // Step 1: Get current object schema to understand structure
    console.log('🔍 Fetching current object schema...');
    const objectSchema = await hubspotClient.crm.schemas.coreApi.getById(CAMPAIGN_DEAL_OBJECT_ID);
    console.log('📋 Object Schema:', JSON.stringify(objectSchema, null, 2));

    // Step 2: Get existing properties to see their structure
    console.log('🔍 Fetching existing properties...');
    const existingProperties = await hubspotClient.crm.properties.coreApi.getAll(CAMPAIGN_DEAL_OBJECT_ID);
    console.log('📋 Sample existing property:', JSON.stringify(existingProperties.results[0], null, 2));

    // Step 3: Try creating a simple test property with minimal structure
    console.log('🧪 Testing simple property creation...');
    
    const testProperty = {
      name: "test_line_items_debug",
      label: "Test Line Items Debug",
      type: "string",
      fieldType: "text",
      description: "Test property for debugging"
    };

    console.log('📤 Sending test property:', JSON.stringify(testProperty, null, 2));

    try {
      const createdProperty = await hubspotClient.crm.properties.coreApi.create(CAMPAIGN_DEAL_OBJECT_ID, testProperty);
      console.log('✅ Test property created successfully:', JSON.stringify(createdProperty, null, 2));
      
      // Clean up test property
      try {
        await hubspotClient.crm.properties.coreApi.archive(CAMPAIGN_DEAL_OBJECT_ID, "test_line_items_debug");
        console.log('🗑️ Test property cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up test property:', cleanupError.message);
      }

    } catch (createError) {
      console.error('❌ Test property creation failed:', createError.message);
      console.error('❌ Full error:', createError);
      
      // Try alternative structure
      console.log('🧪 Trying alternative property structure...');
      
      const altTestProperty = {
        name: "test_line_items_debug2",
        label: "Test Line Items Debug 2",
        type: "string",
        fieldType: "text"
      };

      try {
        const altCreatedProperty = await hubspotClient.crm.properties.coreApi.create(CAMPAIGN_DEAL_OBJECT_ID, altTestProperty);
        console.log('✅ Alternative property created successfully:', JSON.stringify(altCreatedProperty, null, 2));
        
        // Clean up
        try {
          await hubspotClient.crm.properties.coreApi.archive(CAMPAIGN_DEAL_OBJECT_ID, "test_line_items_debug2");
          console.log('🗑️ Alternative test property cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up alternative test property:', cleanupError.message);
        }

      } catch (altCreateError) {
        console.error('❌ Alternative property creation also failed:', altCreateError.message);
        console.error('❌ Full alternative error:', altCreateError);
      }
    }

    // Step 4: Check property groups
    console.log('🔍 Checking property groups...');
    try {
      const propertyGroups = await hubspotClient.crm.properties.groupsApi.getAll(CAMPAIGN_DEAL_OBJECT_ID);
      console.log('📋 Property groups:', JSON.stringify(propertyGroups.results, null, 2));
    } catch (groupError) {
      console.error('❌ Error checking property groups:', groupError.message);
    }

    return {
      status: "SUCCESS",
      message: "Debug completed - check logs for details",
      data: {
        objectId: CAMPAIGN_DEAL_OBJECT_ID,
        schemaFetched: !!objectSchema,
        propertiesFetched: !!existingProperties,
        debugTimestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error during debug:", error);
    return {
      status: "ERROR",
      message: `Debug failed: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};