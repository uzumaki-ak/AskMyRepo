"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  const acceptInvite = api.collaboration.acceptInvitation.useMutation({
    onSuccess: (data: any) => {
      setStatus('success');
      toast.success("Welcome aboard! Invitation accepted.");
      setTimeout(() => {
        router.push(`/dashboard?projectId=${data.projectId}`);
      }, 2000);
    },
    onError: (err: any) => {
      setStatus('error');
      toast.error(err.message || "Something went wrong.");
    }
  });

  useEffect(() => {
    if (token) {
      acceptInvite.mutate({ token });
    } else {
      setStatus('error');
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-20 relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />

      <Card className="max-w-md w-full border-white/5 shadow-2xl backdrop-blur-md bg-background/50">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Divine Invitation</CardTitle>
          <CardDescription>
            Validating your access to the pantheon...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10 gap-6">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground animate-pulse font-mono">Decrypting token...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4 animate-in zoom-in duration-300">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Access Granted</h3>
              <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h3 className="text-xl font-semibold">Invitation Invalid</h3>
              <p className="text-muted-foreground">This invitation may have expired or is no longer valid.</p>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">
                Back to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
