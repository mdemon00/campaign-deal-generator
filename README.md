# Campaign Deal Generator - HubSpot UI Extension

A standalone HubSpot UI Extension for creating and managing campaign deals with line items, commercial agreements integration, and automated CRM synchronization.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- HubSpot CLI installed: `npm install -g @hubspot/cli`
- HubSpot Developer Account with access to UI Extensions
- Active HubSpot portal for development

### Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   cd src/app/extensions && npm install
   cd ../app.functions && npm install
   cd ../../..
   ```

2. **Configure HubSpot CLI**
   ```bash
   hs init
   hs auth
   ```

3. **Set up environment variables**
   - Create a Private App in your HubSpot portal
   - Copy the access token
   - Configure in HubSpot CLI or set PRIVATE_APP_ACCESS_TOKEN

4. **Deploy to HubSpot**
   ```bash
   hs project dev
   ```

5. **Test the Extension**
   - Navigate to any Deal or Company record in your HubSpot portal
   - Look for the "Campaign Deal Generator" tab
   - Click "Test Serverless Connection" to verify everything is working

## 🛠️ Development

### Available Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run deploy` - Deploy to HubSpot

## 📄 License

MIT License - see LICENSE.md for details
