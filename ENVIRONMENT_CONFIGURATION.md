# Environment Configuration Guide

This document explains how to configure the Dropbox Search application using environment variables.

## Required Environment Variables

### Dropbox API Configuration
```bash
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here  
DROPBOX_REFRESH_TOKEN=your_refresh_token_here
```

### Supabase Configuration (for gallery features)
```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Feature Flags

### Gallery Features
Control whether gallery functionality is available:
```bash
VITE_GALLERY_ENABLED=true  # Enable gallery features (default: false)
```

When `VITE_GALLERY_ENABLED=false`:
- Gallery selection checkboxes are hidden in search results
- Gallery navigation link is hidden in header
- Gallery routes are not registered
- Gallery creation modal is not available
- Gallery-related API calls are skipped

### Analytics Features
Control analytics dashboard access:
```bash
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ADMIN_EMAILS=admin@example.com,user@example.com
```

## Usage Examples

### Disable Gallery Features
To run the app with only basic search functionality:
```bash
VITE_GALLERY_ENABLED=false
```

### Production Configuration
For production deployment with all features:
```bash
VITE_GALLERY_ENABLED=true
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ADMIN_EMAILS=admin@yourdomain.com
```

### Development Configuration
For development without gallery features:
```bash
VITE_GALLERY_ENABLED=false
VITE_ANALYTICS_ENABLED=false
```

## Implementation Details

The app uses a centralized configuration utility at `src/utils/config.ts`:

```typescript
export const isGalleryEnabled = (): boolean => {
  return import.meta.env.VITE_GALLERY_ENABLED === 'true';
};
```

Components check this utility before rendering gallery-related features:

```typescript
import { isGalleryEnabled } from '../utils/config';

const MyComponent = () => {
  const galleryEnabled = isGalleryEnabled();
  
  return (
    <div>
      {/* Regular content */}
      
      {/* Gallery features only shown if enabled */}
      {galleryEnabled && (
        <GallerySelectionPanel />
      )}
    </div>
  );
};
```

This allows for easy feature toggling without code changes. 