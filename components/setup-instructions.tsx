'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Key, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SetupInstructionsProps {
  errorMessage?: string;
}

export function SetupInstructions({ errorMessage }: SetupInstructionsProps) {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const envTemplate = `# Dropbox API Configuration
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
DROPBOX_REFRESH_TOKEN=your_refresh_token_here

# Redis Configuration (optional - for caching)
REDIS_URL=redis://localhost:6379

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Setup Required</h1>
          <p className="text-muted-foreground">
            Dropbox API credentials need to be configured before you can search files
          </p>
          {errorMessage && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Step 1: Create Dropbox App */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">1</Badge>
                <CardTitle>Create a Dropbox App</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                First, you need to create a Dropbox app to get your API credentials.
              </p>
              <div className="space-y-2">
                <p className="font-medium">Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>Go to the Dropbox App Console</li>
                  <li>Click &quot;Create app&quot;</li>
                  <li>Choose &quot;Scoped access&quot;</li>
                  <li>Choose &quot;Full Dropbox&quot; access</li>
                  <li>Give your app a name (e.g., &quot;My Search App&quot;)</li>
                  <li>Click &quot;Create app&quot;</li>
                </ol>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a 
                  href="https://www.dropbox.com/developers/apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Dropbox App Console
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Configure App Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">2</Badge>
                <CardTitle>Configure App Permissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configure your app permissions to allow file access.
              </p>
              <div className="space-y-2">
                <p className="font-medium">Required Permissions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Badge variant="outline">files.metadata.read</Badge>
                  <Badge variant="outline">files.content.read</Badge>
                  <Badge variant="outline">file_requests.read</Badge>
                  <Badge variant="outline">sharing.read</Badge>
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  💡 <strong>Tip:</strong> Make sure to enable these permissions in the &quot;Permissions&quot; tab of your app settings.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Get Credentials */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">3</Badge>
                <CardTitle>Get Your Credentials</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Copy your App Key and App Secret from the app settings.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span className="font-medium">App Key:</span>
                  <span className="text-muted-foreground">Found in the &quot;Settings&quot; tab</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span className="font-medium">App Secret:</span>
                  <span className="text-muted-foreground">Click &quot;Show&quot; to reveal</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Generate Refresh Token */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">4</Badge>
                <CardTitle>Generate Refresh Token</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Generate a refresh token to authenticate your application.
              </p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm mb-2">
                  <strong>OAuth URL Template:</strong>
                </p>
                <code className="text-xs bg-background p-2 rounded block break-all">
                  https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&response_type=code&redirect_uri=http://localhost:3000
                </code>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>Replace YOUR_APP_KEY with your actual app key</li>
                <li>Visit the URL in your browser</li>
                <li>Authorize your app</li>
                <li>Copy the authorization code from the redirect URL</li>
                <li>Exchange it for a refresh token using the Dropbox API</li>
              </ol>
              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Advanced:</strong> You&apos;ll need to make a POST request to exchange the auth code for a refresh token. Consider using the Dropbox SDK documentation for detailed steps.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 5: Environment Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">5</Badge>
                <CardTitle>Configure Environment Variables</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Add your credentials to the <code>.env.local</code> file in your project root.
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{envTemplate}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(envTemplate, 'env')}
                >
                  {copiedStep === 'env' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ <strong>Important:</strong> Restart your development server after adding environment variables.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Final Step */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Ready to Search!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Once you&apos;ve completed all steps above, restart your development server and refresh this page to start searching your Dropbox files.
              </p>
              <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help? Check out the{' '}
            <a 
              href="https://developers.dropbox.com/oauth-guide" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Dropbox OAuth Guide
            </a>
            {' '}for detailed instructions.
          </p>
        </div>
      </div>
    </div>
  );
}