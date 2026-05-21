'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] px-4 py-10 text-[#342e29]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png"
            alt="Beforest"
            width={220}
            height={88}
            className="h-auto w-48"
            priority
          />
        </div>

        <Card className="border-[#d8c9ae] bg-[#fffdf9]">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-[#344736] text-[#fdfbf7]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-semibold text-[#342e29]">Beforest Media Library</CardTitle>
            <CardDescription className="text-[#342e29]/70">
              Enter your password to search the Dropbox archive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                className="border-[#d8c9ae] bg-[#fdfbf7] text-[#342e29] placeholder:text-[#342e29]/45 focus-visible:ring-[#86312b]"
              />
            </div>
            {error && (
              <p className="rounded-md border border-[#86312b]/25 bg-[#86312b]/10 px-3 py-2 text-sm text-[#86312b]">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#86312b] text-[#fdfbf7] hover:bg-[#342e29]"
            >
              {loading ? 'Verifying...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] text-[#342e29]">
        <div>Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
