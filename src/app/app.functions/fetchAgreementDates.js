const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const { agreementId } = context.parameters;

    if (!agreementId) {
      return {
        status: "ERROR",
        message: "agreementId parameter is required",
        timestamp: Date.now()
      };
    }

    console.log(`📅 Fetching agreement dates for Agreement ID: ${agreementId}`);

    const COMMERCIAL_AGREEMENTS_OBJECT_ID = "2-39552013";

    // Fetch the commercial agreement with date properties
    const agreement = await hubspotClient.crm.objects.basicApi.getById(
      COMMERCIAL_AGREEMENTS_OBJECT_ID,
      agreementId,
      ['fecha_de_inicio', 'fecha_de_finalizacion'] // Fetch the date properties
    );

    if (!agreement) {
      return {
        status: "ERROR",
        message: `Commercial agreement with ID ${agreementId} not found`,
        timestamp: Date.now()
      };
    }

    const agreementData = {
      fecha_de_inicio: agreement.properties.fecha_de_inicio || null,
      fecha_de_finalizacion: agreement.properties.fecha_de_finalizacion || null
    };

    console.log(`✅ Agreement dates fetched:`, agreementData);

    return {
      status: "SUCCESS",
      data: agreementData,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error("❌ Error fetching agreement dates:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};