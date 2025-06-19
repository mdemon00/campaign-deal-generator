const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    console.log('🔧 Starting Simple Property Setup...');

    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    // Step 1: Create properties one by one with minimal structure
    const results = await createPropertiesOneByOne(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID);
    
    console.log('🎉 Simple Property Setup Complete!');

    return {
      status: "SUCCESS",
      message: "Properties created using simplified approach! 🎉",
      data: {
        objectId: CAMPAIGN_DEAL_OBJECT_ID,
        results: results,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length,
        createdAt: new Date().toISOString()
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error in simple property setup:", error);
    return {
      status: "ERROR",
      message: `Simple setup failed: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Create properties one by one with simplified structure
 */
async function createPropertiesOneByOne(hubspotClient, objectId) {
  const results = [];
  
  // Define properties with minimal required fields
  const properties = [
    {
      name: "line_items_count",
      label: "Line Items Count",
      type: "number",
      fieldType: "number"
    },
    {
      name: "total_budget",
      label: "Total Budget", 
      type: "number",
      fieldType: "number"
    },
    {
      name: "total_billable",
      label: "Total Billable",
      type: "number", 
      fieldType: "number"
    },
    {
      name: "total_bonus",
      label: "Total Bonus",
      type: "number",
      fieldType: "number"
    },
    {
      name: "line_items_saved_date",
      label: "Line Items Saved Date",
      type: "date",
      fieldType: "date"
    },
    {
      name: "line_items_data",
      label: "Line Items Data",
      type: "string", 
      fieldType: "textarea"
    }
  ];

  // Create each property individually
  for (const property of properties) {
    try {
      console.log(`🔧 Creating property: ${property.name}...`);
      console.log(`📤 Property payload:`, JSON.stringify(property, null, 2));
      
      await hubspotClient.crm.properties.coreApi.create(objectId, property);
      
      results.push({
        property: property.name,
        status: 'success',
        message: 'Created successfully'
      });
      
      console.log(`✅ Created: ${property.name}`);
      
    } catch (error) {
      if (error.message?.includes('already exists') || error.response?.status === 409) {
        results.push({
          property: property.name,
          status: 'success',
          message: 'Already exists'
        });
        console.log(`📋 Already exists: ${property.name}`);
      } else {
        results.push({
          property: property.name,
          status: 'error',
          message: error.message,
          error: error.toString()
        });
        console.error(`❌ Failed to create ${property.name}:`, error.message);
      }
    }
  }

  // Create the enumeration property separately (more complex structure)
  try {
    console.log('🔧 Creating enumeration property: line_items_saved...');
    
    const enumProperty = {
      name: "line_items_saved",
      label: "Line Items Saved Status",
      type: "enumeration",
      fieldType: "select",
      options: [
        {
          label: "Not Saved",
          value: "not_saved"
        },
        {
          label: "Saved",
          value: "Saved" 
        },
        {
          label: "In Progress",
          value: "in_progress"
        }
      ]
    };

    console.log(`📤 Enum property payload:`, JSON.stringify(enumProperty, null, 2));
    
    await hubspotClient.crm.properties.coreApi.create(objectId, enumProperty);
    
    results.push({
      property: "line_items_saved",
      status: 'success',
      message: 'Created successfully'
    });
    
    console.log('✅ Created: line_items_saved');
    
  } catch (enumError) {
    if (enumError.message?.includes('already exists') || enumError.response?.status === 409) {
      results.push({
        property: "line_items_saved",
        status: 'success',
        message: 'Already exists'
      });
      console.log('📋 Already exists: line_items_saved');
    } else {
      results.push({
        property: "line_items_saved",
        status: 'error',
        message: enumError.message,
        error: enumError.toString()
      });
      console.error('❌ Failed to create line_items_saved:', enumError.message);
    }
  }

  return results;
}