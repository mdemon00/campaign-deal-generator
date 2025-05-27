import React, { useState, useEffect } from "react";
import {
  Divider,
  Button,
  Text,
  Input,
  Flex,
  hubspot,
  Tile,
  Heading,
  Box,
  Alert,
  LoadingSpinner,
  Select,
  DateInput,
  TextArea,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell
} from "@hubspot/ui-extensions";

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <CampaignDealExtension
    context={context}
    runServerless={runServerlessFunction}
    sendAlert={actions.addAlert}
  />
));

const CampaignDealExtension = ({ context, runServerless, sendAlert }) => {
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  
  // Get current object information
  const objectId = context.crm.objectId;
  const objectType = context.crm.objectType;
  const userName = `${context.user.firstName} ${context.user.lastName}`;

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const response = await runServerless({
        name: "testCampaignDeal",
        parameters: {
          objectId: objectId,
          objectType: objectType,
          testMessage: "Hello from Campaign Deal Generator!"
        }
      });
      
      if (response.status === "SUCCESS") {
        setAlertMessage({
          message: "✅ Campaign Deal Generator is working! Ready to build features.",
          variant: "success"
        });
      } else {
        throw new Error(response.message || "Unknown error");
      }
      
      setTimeout(() => {
        setAlertMessage("");
      }, 4000);
    } catch (error) {
      console.error("Error testing connection:", error);
      setAlertMessage({
        message: `❌ Error: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Divider />
      <Heading>Campaign Deal Generator</Heading>
      <Text variant="microcopy">Hello World - Ready for Development</Text>
      <Divider />
      
      <Tile compact={true}>
        <Box marginBottom="medium">
          <Heading level="3">🚀 Welcome to Campaign Deal Generator</Heading>
          <Text>This is the foundation for your Campaign Deal management system.</Text>
        </Box>
        
        <Divider marginBottom="medium" />
        
        <Box marginBottom="medium">
          <Text format={{ fontWeight: 'bold' }}>Current Context:</Text>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell><Text format={{ fontWeight: 'bold' }}>Object ID:</Text></TableCell>
                <TableCell><Text>{objectId}</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text format={{ fontWeight: 'bold' }}>Object Type:</Text></TableCell>
                <TableCell><Text>{objectType}</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text format={{ fontWeight: 'bold' }}>User:</Text></TableCell>
                <TableCell><Text>{userName}</Text></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
        
        <Divider marginBottom="medium" />
        
        <Flex justify="center" gap="medium" marginBottom="medium">
          <Button 
            onClick={handleTestConnection} 
            variant="primary"
            disabled={loading}
          >
            🧪 Test Serverless Connection
          </Button>
          
          {loading && <LoadingSpinner label="Testing connection..." />}
        </Flex>
        
        {alertMessage && (
          <Box marginBottom="medium">
            <Alert variant={alertMessage.variant}>
              {alertMessage.message}
            </Alert>
          </Box>
        )}
      </Tile>
      
      <Box marginTop="medium">
        <Tile compact={true}>
          <Heading level="3">🏗️ Development Roadmap</Heading>
          <Divider marginBottom="medium" />
          
          <Box marginBottom="small">
            <Text format={{ fontWeight: 'bold' }}>Phase 1: Foundation ✅</Text>
            <Text variant="microcopy">• Hello World UI Extension</Text>
            <Text variant="microcopy">• Basic HubSpot integration</Text>
            <Text variant="microcopy">• Serverless function connectivity</Text>
          </Box>
          
          <Box marginBottom="small">
            <Text format={{ fontWeight: 'bold' }}>Phase 2: Core Features 🔄</Text>
            <Text variant="microcopy">• Campaign deal creation form</Text>
            <Text variant="microcopy">• Commercial agreement integration</Text>
            <Text variant="microcopy">• Advertiser management</Text>
          </Box>
          
          <Box marginBottom="small">
            <Text format={{ fontWeight: 'bold' }}>Phase 3: Line Items 📋</Text>
            <Text variant="microcopy">• Line item creation and management</Text>
            <Text variant="microcopy">• Product catalog integration</Text>
            <Text variant="microcopy">• Pricing and quantity calculations</Text>
          </Box>
          
          <Box marginBottom="small">
            <Text format={{ fontWeight: 'bold' }}>Phase 4: Advanced Features 🚀</Text>
            <Text variant="microcopy">• HubSpot CRM synchronization</Text>
            <Text variant="microcopy">• Reporting and analytics</Text>
            <Text variant="microcopy">• External API integrations</Text>
          </Box>
        </Tile>
      </Box>
    </Box>
  );
};

export default CampaignDealExtension;
