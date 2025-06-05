const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { campaignDealId } = context.parameters;

    console.log('🔍 Checking save status for Campaign Deal:', campaignDealId);

    // Quick fetch of just the save status properties
    const CAMPAIGN_DEAL_OBJECT_ID = "2-45275187"; // ✅ Your Campaign Deal Object ID
    
    const campaignDeal = await hubspotClient.crm.objects.basicApi.getById(
      CAMPAIGN_DEAL_OBJECT_ID,
      campaignDealId,
      [
        'basic_info_saved',
        'basic_info_saved_date',
        'last_modified_date',
        'campaign_name'
      ]
    );

    const properties = campaignDeal.properties;
    const saveStatus = properties.basic_info_saved || 'not_saved';
    const hasCampaignName = !!(properties.campaign_name && properties.campaign_name.trim() !== '');

    const statusInfo = {
      saveStatus,
      hasCampaignName,
      lastSaved: properties.basic_info_saved_date || null,
      lastModified: properties.last_modified_date || null,
      campaignName: properties.campaign_name || ''
    };

    console.log('📊 Save status checked:', statusInfo);

    // Determine user-friendly message
    let message = '';
    let shouldLoad = false;

    switch (saveStatus) {
      case 'saved':
        message = `✅ Basic information saved${properties.basic_info_saved_date ? ` on ${properties.basic_info_saved_date}` : ''}`;
        shouldLoad = true;
        break;
      case 'in_progress':
        message = '🔄 Basic information save in progress...';
        shouldLoad = true;
        break;
      case 'not_saved':
      default:
        if (hasCampaignName) {
          message = '⚠️ Basic information has unsaved changes';
          shouldLoad = true;
        } else {
          message = '📝 Ready to fill basic information';
          shouldLoad = false;
        }
        break;
    }

    return {
      status: "SUCCESS",
      message,
      data: {
        ...statusInfo,
        shouldLoad,
        checkedAt: new Date().toISOString()
      },
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error checking save status:", error);
    return {
      status: "ERROR",
      message: `Failed to check status: ${error.message}`,
      data: {
        saveStatus: 'unknown',
        hasCampaignName: false,
        shouldLoad: false,
        lastSaved: null,
        lastModified: null
      },
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};