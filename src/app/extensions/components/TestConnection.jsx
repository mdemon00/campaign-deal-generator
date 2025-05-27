// src/app/extensions/components/TestConnection.jsx

import React, { useState } from "react";
import {
  Button,
  Flex,
  Tile,
  LoadingSpinner
} from "@hubspot/ui-extensions";

const TestConnection = ({ context, runServerless, onResult }) => {
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    
    try {
      const response = await runServerless({
        name: "testCampaignDeal",
        parameters: {
          objectId: context.crm.objectId,
          objectType: context.crm.objectType,
          testMessage: "Hello from Campaign Deal Generator!"
        }
      });
      
      if (response.status === "SUCCESS") {
        onResult({
          message: "✅ Connection test successful! Ready to create campaign deals.",
          variant: "success"
        });
      } else {
        throw new Error(response.message || "Unknown error");
      }
      
    } catch (error) {
      console.error("Error testing connection:", error);
      onResult({
        message: `❌ Connection Error: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tile compact={true}>
      <Flex justify="center" gap="medium" marginBottom="medium">
        <Button 
          onClick={handleTestConnection} 
          variant="secondary"
          disabled={loading}
        >
          🧪 Test Connection
        </Button>
        {loading && <LoadingSpinner label="Testing..." />}
      </Flex>
    </Tile>
  );
};

export default TestConnection;