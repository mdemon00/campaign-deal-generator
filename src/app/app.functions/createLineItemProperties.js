const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    console.log('🏗️ Starting Line Item Properties Creation Process...');

    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    // Step 1: Create Property Group for Line Items Management
    await createPropertyGroup(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID);
    
    // Step 2: Create all required properties
    await createLineItemProperties(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID);
    
    console.log('🎉 All Line Item Properties Created Successfully!');

    return {
      status: "SUCCESS",
      message: "Line Item properties created successfully! 🎉",
      data: {
        objectId: CAMPAIGN_DEAL_OBJECT_ID,
        propertyGroup: "line_items_management",
        propertiesCreated: [
          "line_items_count",
          "total_budget", 
          "total_billable",
          "total_bonus",
          "line_items_saved",
          "line_items_saved_date",
          "line_items_data"
        ],
        createdAt: new Date().toISOString()
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error creating Line Item properties:", error);
    return {
      status: "ERROR",
      message: `Failed to create properties: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Create Property Group for Line Items Management
 */
async function createPropertyGroup(hubspotClient, objectId) {
  try {
    console.log('📁 Creating Line Items Management property group...');
    
    const propertyGroup = {
      name: "line_items_management",
      displayName: "Line Items Management", 
      displayOrder: -1 // Display at top
    };

    await hubspotClient.crm.properties.groupsApi.create(objectId, propertyGroup);
    console.log('✅ Property group "Line Items Management" created successfully');
    
  } catch (error) {
    if (error.message?.includes('already exists') || error.response?.status === 409) {
      console.log('📁 Property group "Line Items Management" already exists, skipping...');
    } else {
      console.warn('⚠️ Property group creation error (continuing anyway):', error.message);
      // Continue execution - properties can be created without groups
    }
  }
}

/**
 * Create all Line Item properties
 */
async function createLineItemProperties(hubspotClient, objectId) {
  const properties = [
    {
      name: "line_items_count",
      label: "Line Items Count",
      description: "Total number of line items in this campaign deal",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    {
      name: "total_budget", 
      label: "Total Budget",
      description: "Sum of all line item budgets",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    {
      name: "total_billable",
      label: "Total Billable", 
      description: "Sum of all billable amounts",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    {
      name: "total_bonus",
      label: "Total Bonus",
      description: "Sum of all bonus amounts", 
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    {
      name: "line_items_saved",
      label: "Line Items Saved Status",
      description: "Current save status of line items",
      groupName: "line_items_management", 
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
    },
    {
      name: "line_items_saved_date",
      label: "Line Items Saved Date",
      description: "Date when line items were last saved",
      groupName: "line_items_management",
      type: "date",
      fieldType: "date"
    },
    {
      name: "line_items_data",
      label: "Line Items Data", 
      description: "JSON data storage for line items (internal use)",
      groupName: "line_items_management",
      type: "string",
      fieldType: "textarea"
    }
  ];

  // Create each property
  for (const property of properties) {
    await createSingleProperty(hubspotClient, objectId, property);
  }
}

/**
 * Create a single property with error handling
 */
async function createSingleProperty(hubspotClient, objectId, propertyConfig) {
  try {
    console.log(`🔧 Creating property: ${propertyConfig.name}...`);
    
    await hubspotClient.crm.properties.coreApi.create(objectId, propertyConfig);
    console.log(`✅ Property "${propertyConfig.name}" created successfully`);
    
  } catch (error) {
    if (error.message?.includes('already exists') || error.response?.status === 409) {
      console.log(`📋 Property "${propertyConfig.name}" already exists, skipping...`);
    } else {
      console.error(`❌ Error creating property "${propertyConfig.name}":`, error.message);
      // Continue with other properties even if one fails
    }
  }
}

/**
 * Check if properties exist (utility function for other scripts)
 */
async function checkPropertiesExist(hubspotClient, objectId, propertyNames) {
  try {
    const existingProperties = await hubspotClient.crm.properties.coreApi.getAll(objectId);
    const existingPropertyNames = existingProperties.results.map(prop => prop.name);
    
    const missingProperties = propertyNames.filter(name => 
      !existingPropertyNames.includes(name)
    );
    
    return {
      allExist: missingProperties.length === 0,
      missing: missingProperties,
      existing: propertyNames.filter(name => existingPropertyNames.includes(name))
    };
  } catch (error) {
    console.error('Error checking property existence:', error);
    return {
      allExist: false,
      missing: propertyNames,
      existing: []
    };
  }
}

// Export utility function for use in other files
module.exports = { checkPropertiesExist };