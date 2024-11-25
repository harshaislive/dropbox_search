import { Dropbox } from 'dropbox';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export const getAccessToken = async (): Promise<string | null> => {
  const refreshToken = import.meta.env.VITE_DROPBOX_REFRESH_TOKEN;
  const clientId = import.meta.env.VITE_DROPBOX_APP_KEY;
  const clientSecret = import.meta.env.VITE_DROPBOX_APP_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    console.error('Missing required environment variables');
    return null;
  }

  try {
    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
};
