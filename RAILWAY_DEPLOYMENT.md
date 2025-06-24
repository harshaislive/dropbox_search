# Railway Deployment Guide

This guide explains how to deploy your Dropbox Search app to Railway with proper environment variable configuration.

## Required Environment Variables

### 🔑 Dropbox API Configuration (REQUIRED)

These are **required** for the app to function:

```bash
VITE_DROPBOX_APP_KEY=your_dropbox_app_key
VITE_DROPBOX_APP_SECRET=your_dropbox_app_secret_here  
VITE_DROPBOX_REFRESH_TOKEN=your_dropbox_refresh_token_here
```

**Where to get these:**
1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create or select your app
3. Copy App Key and App Secret
4. Generate a refresh token using the OAuth flow

### 🎨 Gallery Features (OPTIONAL)

Only set these if you want gallery functionality:

```bash
VITE_GALLERY_ENABLED=true
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**If you don't want galleries:**
```bash
VITE_GALLERY_ENABLED=false
# Skip the Supabase variables
```

### 📧 Email OTP (OPTIONAL)

For email-based OTP in production:

```bash
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
```

**If you don't have email setup:**
- Skip this variable
- The app will work in development mode (OTP shown in console)

### 📊 Analytics (OPTIONAL)

```bash
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ADMIN_EMAILS=admin@example.com,user@example.com
```

## Setting Environment Variables in Railway

### Method 1: Railway Dashboard
1. Go to your Railway project
2. Click on "Variables" tab
3. Add each variable one by one:
   - Variable: `VITE_DROPBOX_APP_KEY`
   - Value: `your_actual_app_key`
   - Click "Add"

### Method 2: Railway CLI
```bash
railway variables set VITE_DROPBOX_APP_KEY=your_actual_app_key
railway variables set VITE_DROPBOX_APP_SECRET=your_actual_app_secret
railway variables set VITE_DROPBOX_REFRESH_TOKEN=your_actual_refresh_token
```

## Minimal Working Configuration

For a basic working app, you only need:

```bash
VITE_DROPBOX_APP_KEY=your_app_key
VITE_DROPBOX_APP_SECRET=your_app_secret  
VITE_DROPBOX_REFRESH_TOKEN=your_refresh_token
VITE_GALLERY_ENABLED=false
```

## Troubleshooting

### ❌ "Missing required environment variables"
- Check that all Dropbox variables are set in Railway
- Make sure they start with `VITE_` prefix
- Verify values are correct (no extra spaces)

### ❌ "supabaseUrl is required"
- Either set `VITE_GALLERY_ENABLED=false`
- OR add the Supabase variables if you want galleries

### ❌ "Failed to refresh access token: 400"
- Check your Dropbox refresh token is valid
- Verify your App Key and Secret are correct
- Test the refresh token locally first

### ❌ Login page not loading
- Check browser console for specific error messages
- Verify all required variables are set
- Check if `VITE_N8N_WEBHOOK_URL` is needed for your use case

## Verification

After deploying, check the browser console. You should see:

```
🔧 Environment Configuration
  Environment: Production
  Gallery Enabled: true/false
  
📝 Required Variables
  DROPBOX_APP_KEY: ✅ Set
  DROPBOX_APP_SECRET: ✅ Set  
  DROPBOX_REFRESH_TOKEN: ✅ Set
```

If you see ❌ Missing for any required variables, they need to be set in Railway.

## Example Railway Variable Setup

```
VITE_DROPBOX_APP_KEY = "sl.ABcd1234567890"
VITE_DROPBOX_APP_SECRET = "abcd1234567890ef"
VITE_DROPBOX_REFRESH_TOKEN = "ABcd1234567890..."
VITE_GALLERY_ENABLED = "false"
```

**Note:** Railway doesn't need quotes around values when entering them in the dashboard.

## Redeployment

After setting environment variables:
1. Railway will automatically redeploy
2. OR trigger manual deployment in Railway dashboard
3. Check the logs to confirm environment variables are loaded
4. Test the application functionality 