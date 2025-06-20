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

    // Step 2: Update Campaign Deal properties with line items summary
    const totalBudget = lineItems.reduce((sum, item) => sum + (item.totalBudget || 0), 0);
    const totalBillable = lineItems.reduce((sum, item) => sum + (item.totalBillable || 0), 0);
    const totalBonus = lineItems.reduce((sum, item) => sum + (item.totalBonus || 0), 0);

    const updateProperties = {
      line_items_count: lineItems.length,
      total_budget: totalBudget,
      total_billable: totalBillable,
      total_bonus: totalBonus,
      line_items_saved: 'Saved', // ✅ Use 'Saved' with capital S
      line_items_saved_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      last_modified_date: new Date().toISOString().split('T')[0]
    };

    console.log('🔄 Updating Campaign Deal with line items summary:', updateProperties);

    // Update the Campaign Deal object
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    await hubspotClient.crm.objects.basicApi.update(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      { properties: updateProperties }
    );

    console.log('✅ Campaign Deal updated with line items summary');

    // Step 3: Store line items data as a JSON property (for simplicity)
    // In a full implementation, you might create separate Line Item objects
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

    // Step 4: Create associations to related objects if needed
    // For example, if line items reference products, create those associations here

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
        properties: updateProperties
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