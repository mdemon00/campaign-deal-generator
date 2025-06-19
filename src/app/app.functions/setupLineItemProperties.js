const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    console.log('🚀 Starting One-Time Line Item Properties Setup...');

    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    // Step 1: Check current state
    const currentState = await analyzeCurrentState(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID);
    
    // Step 2: Create missing components
    if (!currentState.hasPropertyGroup) {
      await createPropertyGroup(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID);
    } else {
      console.log('📁 Property group already exists');
    }
    
    if (currentState.missingProperties.length > 0) {
      console.log(`🔧 Creating ${currentState.missingProperties.length} missing properties...`);
      await createMissingProperties(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID, currentState.missingProperties);
    } else {
      console.log('✅ All properties already exist');
    }
    
    // Step 3: Verify setup
    const finalState = await analyzeCurrentState(hubspotClient, CAMPAIGN_DEAL_OBJECT_ID);
    
    console.log('🎉 Setup Complete!');

    return {
      status: "SUCCESS",
      message: "Line Item properties setup completed successfully! 🎉",
      data: {
        objectId: CAMPAIGN_DEAL_OBJECT_ID,
        initialState: currentState,
        finalState: finalState,
        setupActions: {
          propertyGroupCreated: !currentState.hasPropertyGroup,
          propertiesCreated: currentState.missingProperties,
          allPropertiesExist: finalState.missingProperties.length === 0
        },
        nextSteps: finalState.missingProperties.length === 0 
          ? ["✅ Setup complete! You can now save line items successfully."]
          : ["⚠️ Some properties still missing. Check logs for errors."],
        completedAt: new Date().toISOString()
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error during setup:", error);
    return {
      status: "ERROR",
      message: `Setup failed: ${error.message}`,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};

/**
 * Analyze current state of properties and groups
 */
async function analyzeCurrentState(hubspotClient, objectId) {
  try {
    console.log('🔍 Analyzing current property state...');
    
    const requiredProperties = [
      'line_items_count',
      'total_budget', 
      'total_billable',
      'total_bonus',
      'line_items_saved',
      'line_items_saved_date',
      'line_items_data'
    ];

    // Check existing properties
    const existingProperties = await hubspotClient.crm.properties.coreApi.getAll(objectId);
    const existingPropertyNames = existingProperties.results.map(prop => prop.name);
    
    const missingProperties = requiredProperties.filter(name => 
      !existingPropertyNames.includes(name)
    );
    
    const existingRequiredProperties = requiredProperties.filter(name => 
      existingPropertyNames.includes(name)
    );

    // Check property groups
    let hasPropertyGroup = false;
    try {
      const propertyGroups = await hubspotClient.crm.properties.groupsApi.getAll(objectId);
      hasPropertyGroup = propertyGroups.results.some(group => group.name === 'line_items_management');
    } catch (groupError) {
      console.warn('⚠️ Could not check property groups:', groupError.message);
    }

    const state = {
      totalProperties: existingProperties.results.length,
      requiredProperties,
      existingRequiredProperties,
      missingProperties,
      hasPropertyGroup,
      allPropertiesExist: missingProperties.length === 0,
      readyForLineItems: missingProperties.length === 0
    };

    console.log('📊 Current State:', {
      requiredCount: requiredProperties.length,
      existingCount: existingRequiredProperties.length, 
      missingCount: missingProperties.length,
      hasPropertyGroup,
      readyForLineItems: state.readyForLineItems
    });

    if (missingProperties.length > 0) {
      console.log('❌ Missing properties:', missingProperties);
    }

    if (existingRequiredProperties.length > 0) {
      console.log('✅ Existing properties:', existingRequiredProperties);
    }

    return state;

  } catch (error) {
    console.error('Error analyzing current state:', error);
    throw error;
  }
}

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
      console.log('📁 Property group "Line Items Management" already exists');
    } else {
      console.error('❌ Property group creation failed:', error.message);
      throw error;
    }
  }
}

/**
 * Create missing properties
 */
async function createMissingProperties(hubspotClient, objectId, missingPropertyNames) {
  // Property definitions
  const propertyDefinitions = {
    line_items_count: {
      name: "line_items_count",
      label: "Line Items Count",
      description: "Total number of line items in this campaign deal",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    total_budget: {
      name: "total_budget", 
      label: "Total Budget",
      description: "Sum of all line item budgets",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    total_billable: {
      name: "total_billable",
      label: "Total Billable", 
      description: "Sum of all billable amounts",
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    total_bonus: {
      name: "total_bonus",
      label: "Total Bonus",
      description: "Sum of all bonus amounts", 
      groupName: "line_items_management",
      type: "number",
      fieldType: "number"
    },
    line_items_saved: {
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
    line_items_saved_date: {
      name: "line_items_saved_date",
      label: "Line Items Saved Date",
      description: "Date when line items were last saved",
      groupName: "line_items_management",
      type: "date",
      fieldType: "date"
    },
    line_items_data: {
      name: "line_items_data",
      label: "Line Items Data", 
      description: "JSON data storage for line items (internal use)",
      groupName: "line_items_management",
      type: "string",
      fieldType: "textarea"
    }
  };

  let successCount = 0;
  let errorCount = 0;

  // Create each missing property
  for (const propertyName of missingPropertyNames) {
    if (propertyDefinitions[propertyName]) {
      try {
        await hubspotClient.crm.properties.coreApi.create(objectId, propertyDefinitions[propertyName]);
        console.log(`✅ Created property: ${propertyName}`);
        successCount++;
      } catch (propError) {
        if (propError.message?.includes('already exists') || propError.response?.status === 409) {
          console.log(`📋 Property "${propertyName}" already exists`);
          successCount++;
        } else {
          console.error(`❌ Failed to create property ${propertyName}:`, propError.message);
          errorCount++;
        }
      }
    } else {
      console.error(`❌ No definition found for property: ${propertyName}`);
      errorCount++;
    }
  }

  console.log(`📊 Property creation results: ${successCount} successful, ${errorCount} failed`);
  
  if (errorCount > 0) {
    throw new Error(`Failed to create ${errorCount} properties. Check logs for details.`);
  }
}