const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { campaignDealId } = context.parameters;

    // console.log($2

    // Step 1: Fetch Campaign Deal properties
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    const campaignDeal = await hubspotClient.crm.objects.basicApi.getById(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      [
        'line_items_count',
        'total_budget',
        'total_billable', 
        'total_bonus',
        'line_items_data',
        'line_items_saved',
        'line_items_saved_date',
        'last_modified_date'
      ]
    );

    const properties = campaignDeal.properties;
    const saveStatus = properties.line_items_saved || 'not_saved';

    console.log('📋 Line Items properties loaded:', {
      saveStatus,
      lineItemsCount: properties.line_items_count,
      totalBudget: properties.total_budget,
      hasLineItemsData: !!properties.line_items_data
    });

    // Step 2: Parse line items data
    let lineItems = [];
    
    if (properties.line_items_data) {
      try {
        lineItems = JSON.parse(properties.line_items_data);
        // console.log($2
      } catch (parseError) {
        console.warn('⚠️ Could not parse line items data:', parseError.message);
        lineItems = [];
      }
    }

    // Step 3: Validate and ensure line items have required structure
    const validatedLineItems = lineItems.map((item, index) => {
      // Ensure all required fields exist with defaults
      return {
        id: item.id || (index + 1),
        name: item.name || '',
        country: item.country || 'MX',
        type: item.type || 'initial',
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        price: Number(item.price) || 0,
        billable: Number(item.billable) || 0,
        bonus: Number(item.bonus) || 0,
        totalBillable: Number(item.totalBillable) || 0,
        totalBonus: Number(item.totalBonus) || 0,
        totalBudget: Number(item.totalBudget) || 0
      };
    });

    // Step 4: Calculate summary data
    const summary = {
      totalBudget: validatedLineItems.reduce((sum, item) => sum + item.totalBudget, 0),
      totalBillable: validatedLineItems.reduce((sum, item) => sum + item.totalBillable, 0),
      totalBonus: validatedLineItems.reduce((sum, item) => sum + item.totalBonus, 0),
      lineItemCount: validatedLineItems.length
    };

    // console.log($2

    // Step 5: Prepare response data
    const responseData = {
      lineItems: validatedLineItems,
      saveStatus,
      summary,
      metadata: {
        campaignDealId,
        lastSaved: properties.line_items_saved_date,
        lastModified: properties.last_modified_date,
        loadedAt: new Date().toISOString()
      }
    };

    // console.log($2

    return {
      status: "SUCCESS",
      message: saveStatus === 'Saved' ? "✅ Saved line items loaded successfully!" : "📝 Ready to add line items",
      data: responseData,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error loading Line Items:", error);
    
    // Return empty line items on error so UI can still function
    return {
      status: "ERROR",
      message: `Failed to load: ${error.message}`,
      data: {
        lineItems: [],
        saveStatus: 'not_saved',
        summary: {
          totalBudget: 0,
          totalBillable: 0,
          totalBonus: 0,
          lineItemCount: 0
        },
        metadata: {}
      },
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};