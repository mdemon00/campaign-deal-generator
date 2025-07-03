const hubspot = require('@hubspot/api-client');

async function fetchProductsForDeal(hubspotClient, dealId) {
  const tableId = "114989443"; 

  try {
    console.log(`Searching products for Deal ID: ${dealId}`);

    const apiResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);

    // Filter products that match the deal_id
    const filteredProducts = apiResponse.results.filter(row => row.values.deal_id == dealId);

    console.log(`Found ${filteredProducts.length} products for Deal ID ${dealId}`);
    
    if (filteredProducts.length === 0) {
      // Log available deal IDs to help with debugging
      const uniqueDealIds = [...new Set(apiResponse.results.map(row => row.values.deal_id))];
      console.log("No products found. Available deal IDs in table:", uniqueDealIds);
    }

    return filteredProducts.map(row => ({
        id: row.id,
        values: row.values
      }));

  } catch (e) {
    console.error(`Error searching products for Deal ID ${dealId}:`, e.message);
    if (e.response && e.response.body) {
      console.error("Error details:", JSON.stringify(e.response.body, null, 2));
    } else {
      console.error("Error without additional details.");
    }
    throw e;
  }
}

exports.main = async (context) => {
  const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
  const hubspotClient = new hubspot.Client({ accessToken });

  try {
    const dealId = context.parameters.dealId;
    const products = await fetchProductsForDeal(hubspotClient, dealId);
    console.log(`Found ${products.length} products for Deal ID ${dealId}`);

    return {
      status: "SUCCESS",
      response: products
    };
  } catch (error) {
    console.error("Error in fetchProductsForDeal function:", error.message);
    return {
      status: "ERROR",
      message: error.message
    };
  }
};