export const isGalleryEnabled = (): boolean => {
  return import.meta.env.VITE_GALLERY_ENABLED === 'true';
};

export const isAnalyticsEnabled = (): boolean => {
  return import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
};

export const getAnalyticsAdminEmails = (): string[] => {
  return (import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS || '').split(',').map(email => email.trim());
}; 