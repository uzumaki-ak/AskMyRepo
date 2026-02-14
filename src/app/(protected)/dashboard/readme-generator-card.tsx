"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  FileText,
  Loader2,
  ExternalLink,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import useProject from "~/hooks/use-project";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";

type ReadmeGeneratorCardProps = {
  variant?: "compact" | "full";
};

export default function ReadmeGeneratorCard({
  variant = "full",
}: ReadmeGeneratorCardProps) {
  const router = useRouter();
  const { projectId, project } = useProject();
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [includeMermaid, setIncludeMermaid] = useState(false);
  const [includeArchitecture, setIncludeArchitecture] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const isCompact = variant === "compact";

  const { data: existingReadme, refetch: refetchReadme } =
    api.readme.get.useQuery(
      { projectId: projectId ?? "" },
      { enabled: !!projectId },
    );

  const generateReadme = api.readme.generate.useMutation({
    onSuccess: () => {
      toast.success("README generated successfully!");
      refetchReadme();
    },
    onError: (error) => {
      toast.error(`Failed to generate README: ${error.message}`);
    },
  });

  const regenerateReadme = api.readme.regenerate.useMutation({
    onSuccess: () => {
      toast.success("README regenerated successfully!");
      refetchReadme();
    },
    onError: (error) => {
      toast.error(`Failed to regenerate README: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    generateReadme.mutate({
      projectId,
      customPrompt: customPrompt || undefined,
      includeMermaid,
      includeArchitecture,
    });
  };

  const handleRegenerate = () => {
    if (!projectId) return;
    regenerateReadme.mutate({
      projectId,
      customPrompt: customPrompt || undefined,
      includeMermaid,
      includeArchitecture,
    });
  };

  const handleCopy = async () => {
    if (!existingReadme?.content) return;
    await navigator.clipboard.writeText(existingReadme.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    if (!existingReadme?.content) return;
    const blob = new Blob([existingReadme.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("README downloaded!");
  };

  const isLoading = generateReadme.isPending || regenerateReadme.isPending;

  if (!projectId) {
    return (
      <Card className="border-muted-foreground/25 bg-muted/10 col-span-1 border-2 border-dashed sm:col-span-2 lg:col-span-2">
        <CardContent className="flex h-40 flex-col items-center justify-center text-center">
          <FileText className="text-muted-foreground/50 h-10 w-10" />
          <p className="text-muted-foreground mt-2 text-sm">
            Select a project to generate README
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 sm:col-span-2 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-5 w-5" />
            <CardTitle className="text-lg">README Generator</CardTitle>
            {existingReadme && (
              <Badge variant="secondary" className="text-xs">
                Generated
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {existingReadme?.content && !isCompact && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Copy</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Download</span>
                </Button>
              </>
            )}
            {existingReadme?.content && isCompact && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push("/readme")}
                className="flex-1 sm:flex-none"
              >
                <FileText className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Open README</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project info */}
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
          <ExternalLink className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground truncate text-sm">
            {project?.githubUrl || "No GitHub URL"}
          </span>
        </div>

        {/* Options collapsible */}
        <Collapsible open={showOptions} onOpenChange={setShowOptions}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Generation Options
              </span>
              {showOptions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="mermaid" className="text-sm">
                Include Mermaid Diagrams
              </Label>
              <Switch
                id="mermaid"
                checked={includeMermaid}
                onCheckedChange={setIncludeMermaid}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="architecture" className="text-sm">
                Include Architecture Section
              </Label>
              <Switch
                id="architecture"
                checked={includeArchitecture}
                onCheckedChange={setIncludeArchitecture}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm">
                Custom Instructions (optional)
              </Label>
              <Textarea
                id="prompt"
                placeholder="E.g., Focus on API documentation, add installation steps for Windows..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="h-20 resize-none"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Generate button */}
        <div className="flex gap-2">
          {!existingReadme?.content ? (
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-2">Generate README</span>
            </Button>
          ) : (
            <Button
              onClick={handleRegenerate}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Regenerate</span>
            </Button>
          )}
        </div>

        {/* README display */}
        {!isCompact && existingReadme?.content && (
          <div className="space-y-3">
            {/* View mode toggle */}
            <div className="border-border flex rounded-md border">
              <Button
                variant={viewMode === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("preview")}
                className="rounded-r-none text-xs"
              >
                Preview
              </Button>
              <Button
                variant={viewMode === "raw" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("raw")}
                className="rounded-l-none text-xs"
              >
                Raw
              </Button>
            </div>

            {/* Content */}
            <div className="border-border bg-muted/30 max-h-[500px] overflow-auto rounded-lg border p-4">
              {viewMode === "preview" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {existingReadme.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="overflow-auto text-xs whitespace-pre-wrap">
                  <code>{existingReadme.content}</code>
                </pre>
              )}
            </div>

            {/* Model info */}
            {existingReadme.model && (
              <p className="text-muted-foreground text-xs">
                Generated with: {existingReadme.model}
              </p>
            )}
          </div>
        )}

        {/* Refinement input */}
        {!isCompact && existingReadme?.content && (
          <div className="border-border space-y-2 border-t pt-4">
            <Label className="text-sm font-medium">
              Refine README (optional)
            </Label>
            <Textarea
              placeholder="E.g., Add more details about the API endpoints, fix the installation section..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="h-16 resize-none"
            />
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={isLoading}
              variant="secondary"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Apply Changes</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
