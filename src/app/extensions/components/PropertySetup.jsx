// src/app/extensions/components/PropertySetup.jsx
// UI Component for testing and running property setup

import React, { useState } from "react";
import {
  Button,
  Flex,
  Box,
  Tile,
  Heading,
  Divider,
  Text,
  Alert,
  LoadingSpinner
} from "@hubspot/ui-extensions";

const PropertySetup = ({ runServerless, context, onAlert }) => {
  const [setupState, setSetupState] = useState('ready'); // ready, running, success, error
  const [setupResult, setSetupResult] = useState(null);
  const [setupError, setSetupError] = useState("");

  const runSetup = async () => {
    setSetupState('running');
    setSetupError("");
    setSetupResult(null);

    try {
      console.log('🚀 Starting property setup...');
      
      // Try the full setup first
      let response = await runServerless({
        name: "setupLineItemProperties",
        parameters: {}
      });

      console.log('📋 Setup response:', response);

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;
        setSetupResult(data);
        setSetupState('success');
        
        onAlert({
          message: "✅ Line Item properties setup completed successfully!",
          variant: "success"
        });
      } else {
        throw new Error(response?.response?.message || "Setup failed");
      }
    } catch (error) {
      console.error('❌ Full setup failed:', error);
      
      // If the full setup fails, try the simplified approach
      console.log('🔄 Trying simplified property setup...');
      
      try {
        const simpleResponse = await runServerless({
          name: "simplePropertySetup",
          parameters: {}
        });

        console.log('📋 Simple setup response:', simpleResponse);

        if (simpleResponse?.status === "SUCCESS" && simpleResponse?.response?.data) {
          const data = simpleResponse.response.data;
          setSetupResult({
            finalState: {
              allPropertiesExist: data.errorCount === 0,
              readyForLineItems: data.errorCount === 0
            },
            setupActions: {
              propertyGroupCreated: false,
              propertiesCreated: data.results.filter(r => r.status === 'success').map(r => r.property)
            },
            nextSteps: data.errorCount === 0 
              ? ["✅ Setup complete! You can now save line items successfully."]
              : ["⚠️ Some properties failed. Check logs for errors."]
          });
          setSetupState('success');
          
          onAlert({
            message: `✅ Simplified setup completed! Created ${data.successCount} properties.`,
            variant: "success"
          });
        } else {
          throw new Error(simpleResponse?.response?.message || "Simplified setup failed");
        }
      } catch (simpleError) {
        console.error('❌ Simplified setup also failed:', simpleError);
        setSetupError(`Both setup methods failed. Full setup: ${error.message}. Simple setup: ${simpleError.message}`);
        setSetupState('error');
        
        onAlert({
          message: `❌ Setup failed: ${simpleError.message}`,
          variant: "error"
        });
      }
    }
  };

  // Debug function
  const runDebug = async () => {
    setSetupState('running');
    setSetupError("");

    try {
      console.log('🐛 Running property creation debug...');
      
      const response = await runServerless({
        name: "debugPropertyCreation",
        parameters: {}
      });

      console.log('🐛 Debug response:', response);
      
      onAlert({
        message: "🐛 Debug completed - check browser console for details",
        variant: "info"
      });
      
      setSetupState('ready');
    } catch (error) {
      console.error('❌ Debug error:', error);
      setSetupError(`Debug failed: ${error.message}`);
      setSetupState('error');
    }
  };

  const checkCurrentState = async () => {
    setSetupState('running');
    setSetupError("");

    try {
      console.log('🔍 Checking current property state...');
      
      // Use the setup function to analyze current state without making changes
      const response = await runServerless({
        name: "setupLineItemProperties", 
        parameters: {}
      });

      if (response?.status === "SUCCESS" && response?.response?.data) {
        const data = response.response.data;
        setSetupResult(data);
        
        if (data.finalState?.allPropertiesExist) {
          setSetupState('success');
          onAlert({
            message: "✅ All line item properties already exist!",
            variant: "success"
          });
        } else {
          setSetupState('ready');
          onAlert({
            message: `⚠️ Missing ${data.finalState?.missingProperties?.length || 0} properties. Run setup to create them.`,
            variant: "warning"
          });
        }
      } else {
        throw new Error(response?.response?.message || "Check failed");
      }
    } catch (error) {
      console.error('❌ Check error:', error);
      setSetupError(error.message);
      setSetupState('error');
    }
  };

  const getStatusDisplay = () => {
    switch (setupState) {
      case 'running':
        return { message: "🔄 Running setup...", color: "medium" };
      case 'success':
        return { message: "✅ Setup completed successfully", color: "success" };
      case 'error':
        return { message: "❌ Setup failed", color: "error" };
      default:
        return { message: "📋 Ready to run setup", color: "medium" };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Tile>
      <Heading>Line Items Properties Setup</Heading>
      <Divider />
      
      <Box marginTop="medium">
        <Text>
          This tool creates the required custom properties for line items functionality.
          Run this setup once after deployment to fix the line items save errors.
        </Text>
      </Box>

      {/* Status Display */}
      <Box marginTop="medium">
        <Flex align="center" gap="small">
          <Text
            variant="microcopy"
            format={{ color: statusDisplay.color, fontWeight: "bold" }}
          >
            {statusDisplay.message}
          </Text>
          {setupState === 'running' && <LoadingSpinner size="xs" />}
        </Flex>
      </Box>

      {/* Error Display */}
      {setupError && (
        <Box marginTop="medium">
          <Alert variant="error">
            <Box marginBottom="small">
              <Text format={{ fontWeight: "bold" }}>Setup Error:</Text>
            </Box>
            <Text>{setupError}</Text>
          </Alert>
        </Box>
      )}

      {/* Setup Results */}
      {setupResult && (
        <Box marginTop="medium">
          <Alert variant={setupState === 'success' ? "success" : "info"}>
            <Box marginBottom="small">
              <Text format={{ fontWeight: "bold" }}>Setup Results:</Text>
            </Box>
            
            {setupResult.finalState && (
              <Box marginTop="small">
                <Text>
                  Required Properties: {setupResult.finalState.requiredProperties?.length || 0}
                </Text>
                <Text>
                  Existing Properties: {setupResult.finalState.existingRequiredProperties?.length || 0}
                </Text>
                <Text>
                  Missing Properties: {setupResult.finalState.missingProperties?.length || 0}
                </Text>
                <Text>
                  Property Group: {setupResult.finalState.hasPropertyGroup ? 'Exists ✅' : 'Missing ❌'}
                </Text>
                <Text>
                  Ready for Line Items: {setupResult.finalState.readyForLineItems ? 'Yes ✅' : 'No ❌'}
                </Text>
              </Box>
            )}

            {setupResult.setupActions && (
              <Box marginTop="small">
                <Box marginBottom="small">
                  <Text format={{ fontWeight: "bold" }}>Actions Taken:</Text>
                </Box>
                <Text>
                  Property Group Created: {setupResult.setupActions.propertyGroupCreated ? 'Yes ✅' : 'Already existed 📋'}
                </Text>
                {setupResult.setupActions.propertiesCreated?.length > 0 && (
                  <Text>
                    Properties Created: {setupResult.setupActions.propertiesCreated.join(', ')}
                  </Text>
                )}
              </Box>
            )}

            {setupResult.nextSteps && (
              <Box marginTop="small">
                <Box marginBottom="small">
                  <Text format={{ fontWeight: "bold" }}>Next Steps:</Text>
                </Box>
                {setupResult.nextSteps.map((step, index) => (
                  <Text key={index}>{step}</Text>
                ))}
              </Box>
            )}
          </Alert>
        </Box>
      )}

      {/* Action Buttons */}
      <Box marginTop="medium">
        <Flex gap="medium" justify="center" wrap="wrap">
          <Button
            variant="secondary"
            onClick={checkCurrentState}
            disabled={setupState === 'running'}
          >
            🔍 Check Status
          </Button>
          
          <Button
            variant="primary"
            onClick={runSetup}
            disabled={setupState === 'running'}
          >
            {setupState === 'running' ? "🔄 Setting up..." : "🚀 Run Setup"}
          </Button>

          <Button
            variant="secondary"
            onClick={runDebug}
            disabled={setupState === 'running'}
          >
            🐛 Debug API
          </Button>
        </Flex>
      </Box>

      {/* Instructions */}
      <Box marginTop="medium">
        <Divider />
        <Box marginTop="small">
          <Box marginBottom="small">
            <Text variant="microcopy" format={{ color: 'medium', fontWeight: 'bold' }}>
              Instructions:
            </Text>
          </Box>
          <Text variant="microcopy" format={{ color: 'medium' }}>
            1. Click "Check Status" to see current property state
          </Text>
          <Text variant="microcopy" format={{ color: 'medium' }}>
            2. Click "Run Setup" to create missing properties (tries multiple approaches)
          </Text>
          <Text variant="microcopy" format={{ color: 'medium' }}>
            3. If setup fails, click "Debug API" to troubleshoot the HubSpot API
          </Text>
          <Text variant="microcopy" format={{ color: 'medium' }}>
            4. After successful setup, line items save functionality will work
          </Text>
          <Text variant="microcopy" format={{ color: 'medium' }}>
            5. Check HubSpot Settings → Properties → Campaign Deal Properties to see new properties
          </Text>
        </Box>
      </Box>
    </Tile>
  );
};

export default PropertySetup;