"use client";

import { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  X,
  Loader2,
  Settings,
} from "lucide-react";

interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  maxTokens: number;
  rateLimit: number;
  apiKeyEnv: string;
  supportsEmbeddings: boolean;
}

const PROVIDER_LINKS: Record<string, string> = {
  groq: "https://console.groq.com/keys",
  google: "https://aistudio.google.com/app/apikey",
  euron: "https://euron.one/api-keys",
  openrouter: "https://openrouter.ai/keys",
  mistral: "https://console.mistral.ai/api-keys",
  openai: "https://platform.openai.com/api-keys",
};

export function ApiKeySettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: providers } = api.apiKeys.getProviders.useQuery();
  const { data: userKeys, refetch: refetchKeys } = api.apiKeys.list.useQuery();
  const { data: configured } = api.apiKeys.checkConfigured.useQuery();
  const { data: preference, refetch: refetchPreference } =
    api.apiKeys.getPreference.useQuery();

  const setApiKey = api.apiKeys.set.useMutation({
    onSuccess: () => {
      toast.success("API key saved successfully");
      setNewApiKey("");
      setSelectedProvider(null);
      setShowAddDialog(false);
      refetchKeys();
    },
    onError: (error) => {
      toast.error(`Failed to save API key: ${error.message}`);
    },
  });

  const deleteApiKey = api.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success("API key deleted");
      refetchKeys();
    },
    onError: (error) => {
      toast.error(`Failed to delete API key: ${error.message}`);
    },
  });

  const toggleApiKey = api.apiKeys.toggle.useMutation({
    onSuccess: () => {
      toast.success("API key status updated");
      refetchKeys();
    },
    onError: (error) => {
      toast.error(`Failed to update API key: ${error.message}`);
    },
  });

  const setPreference = api.apiKeys.setPreference.useMutation({
    onSuccess: () => {
      toast.success("Preferred provider updated");
      refetchPreference();
    },
    onError: (error) => {
      toast.error(`Failed to update preference: ${error.message}`);
    },
  });

  const handleSaveKey = () => {
    if (!selectedProvider || !newApiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    setApiKey.mutate({ provider: selectedProvider, apiKey: newApiKey.trim() });
  };

  const userKeyMap = new Map(userKeys?.map((k) => [k.provider, k]));
  const configuredMap = new Map(configured?.map((c) => [c.provider, c]));
  const embeddingProviders =
    providers?.filter((provider) => provider.supportsEmbeddings) ?? [];
  const configuredEmbeddingProviders = new Set(
    embeddingProviders
      .filter((provider) => {
        const userKey = userKeyMap.get(provider.id);
        const config = configuredMap.get(provider.id);
        return Boolean(userKey?.isActive || config?.hasEnvKey);
      })
      .map((provider) => provider.id),
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" disabled>
        <Key className="h-4 w-4" />
        <span>API Keys</span>
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          <Key className="h-4 w-4" />
          <span>API Keys</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </DialogTitle>
          <DialogDescription>
            Add your own API keys for LLM providers. Keys are used for README generation with automatic fallback.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Info card */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <strong>How it works:</strong> Choose a preferred provider to use for both chat
                responses and embeddings. If no preference is set, the system will fall back to
                other available providers for text tasks.
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Free-tier embeddings:</strong> Gemini uses{" "}
                <code>gemini-embedding-001</code> (free tier, default 3072 dims; recommended 768,
                1536, or 3072).
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Euron:</strong> public docs for free-tier embedding models were not
                accessible; this app will use your <code>EURON_EMBEDDING_MODEL</code> setting.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>OpenRouter:</strong> embeddings are supported via the OpenRouter embeddings
                API. Set <code>OPENROUTER_EMBEDDING_MODEL</code> to the model you want (free models
                vary by provider).
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Groq:</strong> embeddings are not supported, so Groq can’t be used for
                embeddings in this app.
              </p>
              <p className="text-sm text-muted-foreground">
                If you want me to add Mistral embeddings next, tell me which embedding model(s) you
                want to use (and preferred output dimensions).
              </p>
            </CardContent>
          </Card>

          {/* Preferred provider */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Default Provider (Chat + Embeddings)</CardTitle>
              <CardDescription className="text-xs">
                Select a provider to use for both Q&A answers and embeddings. Only providers with
                embedding support are selectable.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <Select
                value={preference?.preferredProvider ?? "__auto__"}
                onValueChange={(value) => {
                  const provider = value === "__auto__" ? null : value;
                  setPreference.mutate({ provider });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auto (fallback)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto (fallback)</SelectItem>
                  {embeddingProviders.map((provider) => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      disabled={!configuredEmbeddingProviders.has(provider.id)}
                    >
                      {provider.name}
                      {!configuredEmbeddingProviders.has(provider.id)
                        ? " (no key)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Provider list */}
          <div className="space-y-3">
            {providers?.map((provider) => {
              const userKey = userKeyMap.get(provider.id);
              const config = configuredMap.get(provider.id);
              const isAdding = showAddDialog && selectedProvider === provider.id;

              return (
                <Card key={provider.id} className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        {config?.hasUserKey && (
                          <Badge variant="default" className="text-xs">
                            Your Key
                          </Badge>
                        )}
                        {config?.hasEnvKey && !config?.hasUserKey && (
                          <Badge variant="secondary" className="text-xs">
                            System Key
                          </Badge>
                        )}
                        {!config?.hasUserKey && !config?.hasEnvKey && (
                          <Badge variant="outline" className="text-xs">
                            Not Configured
                          </Badge>
                        )}
                      </div>
                      <a
                        href={PROVIDER_LINKS[provider.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <CardDescription className="text-xs">
                      Models: {provider.models.join(", ")} • Rate limit: {provider.rateLimit.toLocaleString()}/day
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {isAdding ? (
                      <div className="space-y-3">
                        <Input
                          type="password"
                          placeholder={`Enter your ${provider.name} API key`}
                          value={newApiKey}
                          onChange={(e) => setNewApiKey(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveKey}
                            disabled={setApiKey.isPending}
                          >
                            {setApiKey.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="mr-1 h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowAddDialog(false);
                              setSelectedProvider(null);
                              setNewApiKey("");
                            }}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : userKey ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={userKey.isActive}
                            onCheckedChange={(checked) =>
                              toggleApiKey.mutate({
                                provider: provider.id,
                                isActive: checked,
                              })
                            }
                          />
                          <span className="text-sm">
                            {userKey.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete your {provider.name} API key? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteApiKey.mutate({ provider: provider.id })
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProvider(provider.id);
                          setShowAddDialog(true);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add API Key
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
