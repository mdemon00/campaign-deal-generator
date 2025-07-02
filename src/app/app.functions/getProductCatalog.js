// src/app/app.functions/getProductCatalog.js

const hubspot = require('@hubspot/api-client');

exports.main = async (context) => {
  try {
    const { 
      searchTerm = "", 
      category = "", 
      buyingModel = "",
      media = "",
      currency = "MXN",
      limit = 50 
    } = context.parameters;

    // console.log($2

    // Static pricing table (in production, this could be stored in HubSpot or external DB)
    const pricingTable = [
      { id: "dsp_display_branding_web_cpm", media: "Web & Mobile", buyingModel: "CPM", contentType: "Display", category: "DSP Display Branding", pricingMXN: "45.00", pricingUSD: "2.19", pricingBRL: "12.89", units: "Impressions" },
      { id: "dsp_display_branding_web_video_cpm", media: "Web & Mobile", buyingModel: "CPM", contentType: "Video", category: "DSP Display Branding", pricingMXN: "90.00", pricingUSD: "4.38", pricingBRL: "25.78", units: "Impressions" },
      { id: "dsp_video_branding_ctv_cpm", media: "CTV", buyingModel: "CPM", contentType: "Video", category: "DSP Video Branding", pricingMXN: "120.00", pricingUSD: "5.84", pricingBRL: "34.38", units: "Impressions" },
      { id: "dsp_video_branding_ctv_cpv", media: "CTV", buyingModel: "CPV", contentType: "Video", category: "DSP Video Branding", pricingMXN: "-", pricingUSD: "-", pricingBRL: "-", units: "Views" },
      { id: "dsp_display_traffic_web_cpc", media: "Web & Mobile", buyingModel: "CPC", contentType: "Display", category: "DSP Display Traffic", pricingMXN: "4.00", pricingUSD: "0.19", pricingBRL: "1.15", units: "Clicks" },
      { id: "dsp_display_traffic_native_cpc", media: "Web & Mobile", buyingModel: "CPC", contentType: "Native", category: "DSP Display Traffic", pricingMXN: "4.00", pricingUSD: "0.19", pricingBRL: "1.15", units: "Clicks" },
      { id: "dsp_display_performance_web_cpc", media: "Web & Mobile", buyingModel: "CPC", contentType: "Display", category: "DSP Display Performance", pricingMXN: "8.00", pricingUSD: "0.39", pricingBRL: "2.29", units: "Clicks" },
      { id: "dsp_display_performance_web_cpa", media: "Web & Mobile", buyingModel: "CPA", contentType: "Display", category: "DSP Display Performance", pricingMXN: "-", pricingUSD: "-", pricingBRL: "-", units: "Acquisitions" },
      { id: "dsp_display_performance_web_roas", media: "Web & Mobile", buyingModel: "ROAS", contentType: "Display", category: "DSP Display Performance", pricingMXN: "-", pricingUSD: "-", pricingBRL: "-", units: "Revenue" },
      { id: "dsp_display_performance_web_cpi", media: "Web & Mobile", buyingModel: "CPI", contentType: "Display", category: "DSP Display Performance", pricingMXN: "-", pricingUSD: "-", pricingBRL: "-", units: "Installs" },
      { id: "dsp_display_performance_native_cpc", media: "Web & Mobile", buyingModel: "CPC", contentType: "Native", category: "DSP Display Performance", pricingMXN: "6.00", pricingUSD: "0.29", pricingBRL: "1.72", units: "Clicks" },
      { id: "dsp_display_performance_native_cpa", media: "Web & Mobile", buyingModel: "CPA", contentType: "Native", category: "DSP Display Performance", pricingMXN: "-", pricingUSD: "-", pricingBRL: "-", units: "Acquisitions" },
      { id: "retail_media_web_cpm", media: "Web & Mobile", buyingModel: "CPM", contentType: "Display", category: "RETAIL MEDIA", pricingMXN: "45.00", pricingUSD: "2.19", pricingBRL: "12.89", units: "Impressions" },
      { id: "retail_media_onsite_cpm", media: "On Site & Off Site", buyingModel: "CPM", contentType: "Display", category: "RETAIL MEDIA", pricingMXN: "60.00", pricingUSD: "2.92", pricingBRL: "17.19", units: "Impressions" },
      { id: "retail_media_web_cpc", media: "Web & Mobile", buyingModel: "CPC", contentType: "Display", category: "RETAIL MEDIA", pricingMXN: "4.00", pricingUSD: "0.19", pricingBRL: "1.15", units: "Clicks" },
      { id: "pdooh_display_cpm", media: "DOOH", buyingModel: "CPM", contentType: "Display", category: "pDOOH", pricingMXN: "400.00", pricingUSD: "19.46", pricingBRL: "114.59", units: "Impressions" },
      { id: "pdooh_video_cpm", media: "DOOH", buyingModel: "CPM", contentType: "Video", category: "pDOOH", pricingMXN: "400.00", pricingUSD: "19.46", pricingBRL: "114.59", units: "Impressions" },
      { id: "pmp_display_cpm", media: "N/A", buyingModel: "CPM", contentType: "Display", category: "PMP", pricingMXN: "45.00", pricingUSD: "2.19", pricingBRL: "12.89", units: "Impressions" },
      { id: "pmp_video_cpm", media: "N/A", buyingModel: "CPM", contentType: "Video", category: "PMP", pricingMXN: "115.00", pricingUSD: "5.59", pricingBRL: "32.95", units: "Impressions" },
      { id: "dco_display_cpm", media: "N/A", buyingModel: "CPM", contentType: "Display", category: "DCO", pricingMXN: "8.00", pricingUSD: "0.39", pricingBRL: "2.29", units: "Impressions" },
      { id: "dco_video_cpm", media: "N/A", buyingModel: "CPM", contentType: "Video", category: "DCO", pricingMXN: "16.00", pricingUSD: "0.78", pricingBRL: "4.58", units: "Impressions" },
      { id: "cro_monthly_display", media: "On Site (ecommerce)", buyingModel: "Monthly Fee", contentType: "Display", category: "CRO", pricingMXN: "90000.00", pricingUSD: "4377.43", pricingBRL: "25783.07", units: "Months" },
      { id: "cro_monthly_native", media: "On Site (ecommerce)", buyingModel: "Monthly Fee", contentType: "Native", category: "CRO", pricingMXN: "90000.00", pricingUSD: "4377.43", pricingBRL: "25783.07", units: "Months" },
      { id: "feed_monthly_display", media: "Social", buyingModel: "Monthly Fee", contentType: "Display", category: "FEED", pricingMXN: "60000.00", pricingUSD: "2918.29", pricingBRL: "17188.72", units: "Months" }
    ];

    // Apply filters
    let filteredProducts = pricingTable;

    if (searchTerm && searchTerm.trim() !== "") {
      const search = searchTerm.toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        product.category.toLowerCase().includes(search) ||
        product.media.toLowerCase().includes(search) ||
        product.contentType.toLowerCase().includes(search) ||
        product.buyingModel.toLowerCase().includes(search)
      );
    }

    if (category && category !== "") {
      filteredProducts = filteredProducts.filter(product => product.category === category);
    }

    if (buyingModel && buyingModel !== "") {
      filteredProducts = filteredProducts.filter(product => product.buyingModel === buyingModel);
    }

    if (media && media !== "") {
      filteredProducts = filteredProducts.filter(product => product.media === media);
    }

    // Limit results
    filteredProducts = filteredProducts.slice(0, limit);

    // Format products for UI
    const formattedProducts = filteredProducts.map(product => {
      const priceField = `pricing${currency === 'R' ? 'BRL' : currency}`;
      const price = product[priceField] || "0.00";
      const isAvailable = price !== "-";

      // Create display name
      const displayName = `${product.category} - ${product.media} ${product.contentType} (${product.buyingModel})`;

      return {
        id: product.id,
        label: displayName,
        value: product.id,
        
        // Product details
        category: product.category,
        media: product.media,
        contentType: product.contentType,
        buyingModel: product.buyingModel,
        units: product.units,
        
        // Pricing
        price: isAvailable ? parseFloat(price) : 0,
        priceDisplay: isAvailable ? `${price} ${currency}` : "Quote Required",
        currency: currency,
        isAvailable: isAvailable,
        
        // All pricing for reference
        allPricing: {
          MXN: product.pricingMXN,
          USD: product.pricingUSD,
          BRL: product.pricingBRL
        }
      };
    });

    // Get filter options
    const categories = [...new Set(pricingTable.map(p => p.category))].sort();
    const buyingModels = [...new Set(pricingTable.map(p => p.buyingModel))].sort();
    const mediaTypes = [...new Set(pricingTable.map(p => p.media))].sort();

    // console.log($2

    return {
      status: "SUCCESS",
      message: `Found ${formattedProducts.length} products`,
      data: {
        products: formattedProducts,
        totalCount: formattedProducts.length,
        searchTerm,
        filters: {
          categories: categories.map(cat => ({ label: cat, value: cat })),
          buyingModels: buyingModels.map(bm => ({ label: bm, value: bm })),
          mediaTypes: mediaTypes.map(mt => ({ label: mt, value: mt }))
        },
        currency,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    console.error("❌ Error in product catalog:", error);
    return {
      status: "ERROR",
      message: error.message,
      errorDetails: error.toString(),
      timestamp: Date.now()
    };
  }
};