// Environment configuration and validation
export const ENV_CONFIG = {
  // Dropbox Configuration
  DROPBOX_APP_KEY: import.meta.env.VITE_DROPBOX_APP_KEY || '',
  DROPBOX_APP_SECRET: import.meta.env.VITE_DROPBOX_APP_SECRET || '',
  DROPBOX_REFRESH_TOKEN: import.meta.env.VITE_DROPBOX_REFRESH_TOKEN || '',
  
  // Supabase Configuration (optional - for gallery features)
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  
  // N8N Webhook (optional - for email OTP)
  N8N_WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
  
  // Feature Flags
  GALLERY_ENABLED: import.meta.env.VITE_GALLERY_ENABLED === 'true',
  ANALYTICS_ENABLED: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  ANALYTICS_ADMIN_EMAILS: (import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS || '').split(',').map(email => email.trim()),
  
  // Environment Info
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

// Validation functions
export const validateRequiredEnv = () => {
  const missing: string[] = [];
  
  // Required Dropbox variables
  if (!ENV_CONFIG.DROPBOX_APP_KEY) missing.push('VITE_DROPBOX_APP_KEY');
  if (!ENV_CONFIG.DROPBOX_APP_SECRET) missing.push('VITE_DROPBOX_APP_SECRET');
  if (!ENV_CONFIG.DROPBOX_REFRESH_TOKEN) missing.push('VITE_DROPBOX_REFRESH_TOKEN');
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings: getOptionalWarnings()
  };
};

export const getOptionalWarnings = () => {
  const warnings: string[] = [];
  
  if (ENV_CONFIG.GALLERY_ENABLED) {
    if (!ENV_CONFIG.SUPABASE_URL) warnings.push('VITE_SUPABASE_URL (required for gallery features)');
    if (!ENV_CONFIG.SUPABASE_ANON_KEY) warnings.push('VITE_SUPABASE_ANON_KEY (required for gallery features)');
  }
  
  if (!ENV_CONFIG.N8N_WEBHOOK_URL && ENV_CONFIG.IS_PRODUCTION) {
    warnings.push('VITE_N8N_WEBHOOK_URL (required for email OTP in production)');
  }
  
  return warnings;
};

// Debug logging for environment variables
export const logEnvironmentStatus = () => {
  const validation = validateRequiredEnv();
  
  console.group('🔧 Environment Configuration');
  console.log('Environment:', ENV_CONFIG.IS_PRODUCTION ? 'Production' : 'Development');
  console.log('Gallery Enabled:', ENV_CONFIG.GALLERY_ENABLED);
  console.log('Analytics Enabled:', ENV_CONFIG.ANALYTICS_ENABLED);
  
  console.group('📝 Required Variables');
  console.log('DROPBOX_APP_KEY:', ENV_CONFIG.DROPBOX_APP_KEY ? '✅ Set' : '❌ Missing');
  console.log('DROPBOX_APP_SECRET:', ENV_CONFIG.DROPBOX_APP_SECRET ? '✅ Set' : '❌ Missing');
  console.log('DROPBOX_REFRESH_TOKEN:', ENV_CONFIG.DROPBOX_REFRESH_TOKEN ? '✅ Set' : '❌ Missing');
  console.groupEnd();
  
  console.group('🔧 Optional Variables');
  console.log('SUPABASE_URL:', ENV_CONFIG.SUPABASE_URL ? '✅ Set' : '⚠️ Not set');
  console.log('SUPABASE_ANON_KEY:', ENV_CONFIG.SUPABASE_ANON_KEY ? '✅ Set' : '⚠️ Not set');
  console.log('N8N_WEBHOOK_URL:', ENV_CONFIG.N8N_WEBHOOK_URL ? '✅ Set' : '⚠️ Not set');
  console.groupEnd();
  
  if (!validation.isValid) {
    console.group('❌ Missing Required Variables');
    validation.missing.forEach(variable => console.error(`Missing: ${variable}`));
    console.groupEnd();
  }
  
  if (validation.warnings.length > 0) {
    console.group('⚠️ Warnings');
    validation.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }
  
  console.groupEnd();
  
  return validation;
};

// Export individual configs for backwards compatibility
export const {
  DROPBOX_APP_KEY,
  DROPBOX_APP_SECRET,
  DROPBOX_REFRESH_TOKEN,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  N8N_WEBHOOK_URL,
  GALLERY_ENABLED,
  ANALYTICS_ENABLED,
  ANALYTICS_ADMIN_EMAILS,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
} = ENV_CONFIG; 