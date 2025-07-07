# Environment Setup

Create a `.env` file in the root directory with these exact variables:

```env
# Weaviate Configuration
WEAVIATE_URL=https://weaviate-wdke-production.up.railway.app
WEAVIATE_API_KEY=your_weaviate_api_key_here

# Dropbox Configuration  
DROPBOX_APP_KEY=your_dropbox_app_key_here
DROPBOX_APP_SECRET=your_dropbox_app_secret_here
DROPBOX_REFRESH_TOKEN=your_dropbox_refresh_token_here

# CLIP API Configuration (for image search)
CLIP_API_URL=https://clipserver-production.up.railway.app

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Get Your Credentials:

### Weaviate API Key:
1. Go to your Weaviate Console
2. Find your API key for the `weaviate-wdke-production.up.railway.app` instance

### Dropbox API Credentials:
1. Go to https://www.dropbox.com/developers/apps
2. Create a new app or use existing one
3. Get:
   - App Key
   - App Secret  
   - Generate a Refresh Token (follow Dropbox OAuth flow)

## After Setting Up:

1. Copy the above into a `.env` file
2. Replace the placeholder values with your actual credentials
3. Run: `npm run dev`
4. Test at: http://localhost:3000

The app will now:
✅ Search your `DropboxFile` class in Weaviate
✅ Use the `dropbox_path` field to get fresh thumbnails
✅ Generate download links via Dropbox API
✅ Display results with pagination (20 at a time) 