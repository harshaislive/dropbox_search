# Railway Environment Variables Troubleshooting Guide

## Current Issues Being Resolved

Based on the console errors you're seeing, the following environment variables are missing or incorrectly configured in Railway:

### Critical Missing Variables:
1. **VITE_DROPBOX_APP_KEY** - Your Dropbox app key
2. **VITE_DROPBOX_APP_SECRET** - Your Dropbox app secret  
3. **VITE_DROPBOX_REFRESH_TOKEN** - Your Dropbox refresh token
4. **VITE_N8N_WEBHOOK_URL** - Your n8n webhook URL for authentication
5. **VITE_SUPABASE_URL** - Your Supabase project URL (if using gallery features)
6. **VITE_SUPABASE_ANON_KEY** - Your Supabase anonymous key (if using gallery features)

## Step-by-Step Fix

### 1. Access Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Log in to your account
3. Select your project (dropbox_search)

### 2. Configure Environment Variables
1. Click on your service/deployment
2. Go to the **"Variables"** tab
3. Click **"+ New Variable"** for each missing variable

### 3. Add Required Variables

#### For Dropbox Integration (Required):
```
VITE_DROPBOX_APP_KEY=your_dropbox_app_key_here
VITE_DROPBOX_APP_SECRET=your_dropbox_app_secret_here
VITE_DROPBOX_REFRESH_TOKEN=your_dropbox_refresh_token_here
```

#### For Authentication (Required):
```
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

#### For Gallery Features (Optional):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_GALLERY_ENABLED=true
```

### 4. Deploy Changes
1. After adding all variables, Railway should automatically redeploy
2. If not, click **"Deploy"** or trigger a new deployment
3. Wait for deployment to complete

## How to Find Your Credentials

### Dropbox Credentials:
1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Select your app
3. **App Key** and **App Secret** are shown in the settings
4. **Refresh Token** was generated during your OAuth flow

### n8n Webhook URL:
1. Log in to your n8n instance
2. Find your webhook node
3. Copy the webhook URL

### Supabase Credentials:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings > API**
4. Copy **Project URL** and **Project API Key (anon/public)**

## Verification Steps

### 1. Check Railway Logs
After deployment, check your Railway logs for these success messages:
```
✅ Dropbox environment variables configured correctly
✅ Authentication environment variables configured correctly
✅ Initializing Supabase client for gallery features (if enabled)
```

### 2. Test the Application
1. Visit your deployed URL
2. The environment error banner should disappear
3. Try logging in with OTP
4. Test Dropbox search functionality

## Common Issues & Solutions

### Issue: "Failed to refresh access token: 400"
**Solution:** Your Dropbox credentials are incorrect or expired
- Double-check your App Key, App Secret, and Refresh Token
- Ensure the refresh token hasn't expired
- Re-generate refresh token if needed

### Issue: "supabaseUrl is required"
**Solution:** Either configure Supabase or disable gallery features
- Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, OR
- Set VITE_GALLERY_ENABLED=false to disable galleries

### Issue: "VITE_N8N_WEBHOOK_URL environment variable is not set"
**Solution:** Configure your authentication webhook
- Set up n8n webhook for OTP authentication
- Add the webhook URL to Railway variables

### Issue: Variables not taking effect
**Solutions:**
1. Ensure variable names are EXACTLY as shown (case-sensitive)
2. Don't include quotes around values in Railway
3. Trigger a new deployment after adding variables
4. Clear browser cache and try again

## Environment Variable Format

❌ **Wrong:**
```
"VITE_DROPBOX_APP_KEY"="your_key_here"
'VITE_DROPBOX_APP_KEY'='your_key_here'
```

✅ **Correct:**
```
VITE_DROPBOX_APP_KEY=your_key_here
```

## Testing Locally

To test environment variables locally before deploying:

1. Create a `.env` file in your project root:
```env
VITE_DROPBOX_APP_KEY=your_key_here
VITE_DROPBOX_APP_SECRET=your_secret_here
VITE_DROPBOX_REFRESH_TOKEN=your_token_here
VITE_N8N_WEBHOOK_URL=your_webhook_url_here
VITE_GALLERY_ENABLED=true
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_key_here
```

2. Run locally:
```bash
npm run dev
```

3. Check for the success messages in console

## Get Help

If you're still experiencing issues:

1. **Check Railway Logs:** Look for specific error messages
2. **Browser Console:** Check for detailed error information
3. **Environment Panel:** Verify all variables are set correctly
4. **Test Locally:** Ensure everything works with a local `.env` file first

## Next Steps

Once your environment variables are configured:
1. Your app should load without errors
2. Authentication will work via OTP
3. Dropbox search will function properly
4. Gallery features will be available (if enabled and configured)

The application has built-in environment validation and will show helpful error messages if anything is still missing. 