const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const {
      campaignDealId,
      lineItems,
      createdBy
    } = context.parameters;

    console.log('💾 Saving Line Items:', {
      campaignDealId,
      lineItemsCount: lineItems?.length || 0,
      createdBy,
      timestamp: new Date().toISOString()
    });

    // Step 1: Validate input
    if (!lineItems || !Array.isArray(lineItems)) {
      throw new Error("Invalid line items data provided");
    }

    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID

    // Step 2: Check if required properties exist
    const requiredProperties = [
      'line_items_count',
      'total_budget', 
      'total_billable',
      'total_bonus',
      'line_items_saved',
      'line_items_saved_date',
      'line_items_data'
    ];

    const propertyCheck = await checkPropertiesExist(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID, requiredProperties);
    
    if (!propertyCheck.allExist) {
      console.warn('⚠️ Some line item properties are missing:', propertyCheck.missing);
      console.log('💡 Creating missing properties automatically...');
      
      // Attempt to create missing properties
      try {
        await createMissingProperties(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID, propertyCheck.missing);
        console.log('✅ Missing properties created successfully');
      } catch (createError) {
        console.error('❌ Failed to create missing properties:', createError.message);
        throw new Error(`Required properties missing and could not be created: ${propertyCheck.missing.join(', ')}`);
      }
    }

    // Step 3: Calculate line items summary
    const totalBudget = lineItems.reduce((sum, item) => sum + (item.totalBudget || 0), 0);
    const totalBillable = lineItems.reduce((sum, item) => sum + (item.totalBillable || 0), 0);
    const totalBonus = lineItems.reduce((sum, item) => sum + (item.totalBonus || 0), 0);

    // Step 4: Prepare update properties with error handling
    const updateProperties = {};
    
    // Only include properties that exist
    if (propertyCheck.existing.includes('line_items_count') || propertyCheck.allExist) {
      updateProperties.line_items_count = lineItems.length;
    }
    
    if (propertyCheck.existing.includes('total_budget') || propertyCheck.allExist) {
      updateProperties.total_budget = totalBudget;
    }
    
    if (propertyCheck.existing.includes('total_billable') || propertyCheck.allExist) {
      updateProperties.total_billable = totalBillable;
    }
    
    if (propertyCheck.existing.includes('total_bonus') || propertyCheck.allExist) {
      updateProperties.total_bonus = totalBonus;
    }
    
    if (propertyCheck.existing.includes('line_items_saved') || propertyCheck.allExist) {
      updateProperties.line_items_saved = 'Saved'; // ✅ Use 'Saved' with capital S
    }
    
    if (propertyCheck.existing.includes('line_items_saved_date') || propertyCheck.allExist) {
      updateProperties.line_items_saved_date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    // Always update last_modified_date (this should exist by default)
    updateProperties.last_modified_date = new Date().toISOString().split('T')[0];

    console.log('🔄 Updating Campaign Deal with line items summary:', updateProperties);

    // Step 5: Update the Campaign Deal object
    await hubspotClient.crm.objects.basicApi.update(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      { properties: updateProperties }
    );

    console.log('✅ Campaign Deal updated with line items summary');

    // Step 6: Store line items data as JSON (if property exists)
    if (propertyCheck.existing.includes('line_items_data') || propertyCheck.allExist) {
      try {
        const lineItemsJson = JSON.stringify(lineItems);
        
        await hubspotClient.crm.objects.basicApi.update(
          CAMPAIGN_DEAL_OBJECT_ID,
          campaignDealId,
          { 
            properties: {
              line_items_data: lineItemsJson // Store as JSON in a text property
            }
          }
        );

        console.log('✅ Line items data stored successfully');
      } catch (jsonError) {
        console.warn('⚠️ Could not store line items JSON data:', jsonError.message);
        // Continue execution - this is not critical
      }
    } else {
      console.warn('⚠️ line_items_data property not found, skipping JSON storage');
    }

    console.log('🎉 Line Items saved successfully!');

    return {
      status: "SUCCESS",
      message: "Line Items saved successfully! 🎉",
      data: {
        campaignDealId,
        savedAt: new Date().toISOString(),
        lineItemsCount: lineItems.length,
        summary: {
          totalBudget,
          totalBillable,
          totalBonus,
          lineItemCount: lineItems.length
        },
        properties: updateProperties,
        propertiesUsed: Object.keys(updateProperties)
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error saving Line Items:", error);
    return {
      status: "ERROR", 
      message: `Failed to save: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Check if properties exist in the object schema
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

/**
 * Create missing properties on-the-fly
 */
async function createMissingProperties(hubspotClient, objectId, missingPropertyNames) {
  // Property definitions for missing properties with correct API structure
  const propertyDefinitions = {
    line_items_count: {
      name: "line_items_count",
      label: "Line Items Count",
      description: "Total number of line items in this campaign deal",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number",
      objectType: objectId
    },
    total_budget: {
      name: "total_budget", 
      label: "Total Budget",
      description: "Sum of all line item budgets",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number",
      objectType: objectId
    },
    total_billable: {
      name: "total_billable",
      label: "Total Billable", 
      description: "Sum of all billable amounts",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number",
      objectType: objectId
    },
    total_bonus: {
      name: "total_bonus",
      label: "Total Bonus",
      description: "Sum of all bonus amounts", 
      groupName: "line_items_management",
      type: "number",
      fieldType: "number",
      objectType: objectId
    },
    line_items_saved: {
      name: "line_items_saved",
      label: "Line Items Saved Status",
      description: "Current save status of line items",
      groupName: "line_items_management", 
      type: "enumeration",
      fieldType: "select",
      objectType: objectId,
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
    line_items_saved_date: {
      name: "line_items_saved_date",
      label: "Line Items Saved Date",
      description: "Date when line items were last saved",
      groupName: "line_items_management",
      type: "date",
      fieldType: "date",
      objectType: objectId
    },
    line_items_data: {
      name: "line_items_data",
      label: "Line Items Data", 
      description: "JSON data storage for line items (internal use)",
      groupName: "line_items_management",
      type: "string",
      fieldType: "textarea",
      objectType: objectId
    }
  };

  // Create property group first (if it doesn't exist)
  try {
    const propertyGroup = {
      name: "line_items_management",
      displayName: "Line Items Management", 
      displayOrder: -1
    };
    await hubspotClient.crm.properties.groupsApi.create(objectId, propertyGroup);
    console.log('✅ Property group "Line Items Management" created');
  } catch (groupError) {
    if (groupError.message?.includes('already exists') || groupError.response?.status === 409) {
      console.log('📁 Property group already exists');
    } else {
      console.warn('⚠️ Could not create property group:', groupError.message);
    }
  }

  // Create each missing property
  for (const propertyName of missingPropertyNames) {
    if (propertyDefinitions[propertyName]) {
      try {
        console.log(`🔧 Creating property: ${propertyName}...`);
        console.log(`📋 Property payload:`, JSON.stringify(propertyDefinitions[propertyName], null, 2));
        
        await hubspotClient.crm.properties.coreApi.create(objectId, propertyDefinitions[propertyName]);
        console.log(`✅ Created missing property: ${propertyName}`);
      } catch (propError) {
        console.error(`❌ Failed to create property ${propertyName}:`, propError.message);
        console.error(`❌ Full property error:`, propError);
        throw propError;
      }
    } else {
      console.warn(`⚠️ No definition found for missing property: ${propertyName}`);
    }
  }
}