"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import useProject from "~/hooks/use-project";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, Send, AlertCircle, Github, Code, History as HistoryIcon, Clock, ExternalLink, FileText, Search, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { Compare } from "~/components/ui/compare";

const AgentPage = () => {
  const { project } = useProject();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [change, setChange] = useState<{ fileName: string; oldCode: string; newCode: string; prompt?: string } | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  const { data: projectFiles } = api.agent.getProjectFiles.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const { data: aiHistory, refetch: refetchHistory } = api.agent.getAiHistory.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const generateChange = api.agent.generateCodeChange.useMutation({
    onSuccess: (data) => {
      setChange({ ...data, prompt }); 
      setCommitMessage(data.commitMessage || `feat: update ${data.fileName}`);
      setLoading(false);
      setActiveTab("editor");
    },
    onError: (error) => {
      toast.error(error.message);
      setLoading(false);
    },
  });

  const commitChange = api.agent.commitFileChange.useMutation({
    onSuccess: (data) => {
      toast.success("Successfully committed to GitHub!");
      setChange(null);
      setPrompt("");
      setCommitting(false);
      refetchHistory();
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(error.message);
      setCommitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !prompt.trim()) return;
    setLoading(true);
    setChange(null);
    generateChange.mutate({ projectId: project.id, prompt, selectedFile });
  };

  const handleCommit = () => {
    if (!project?.id || !change || !commitMessage.trim()) return;
    setCommitting(true);
    commitChange.mutate({
      projectId: project.id,
      fileName: change.fileName,
      content: change.newCode,
      commitMessage,
      prompt: change.prompt || prompt,
      oldCode: change.oldCode,
      newCode: change.newCode,
    });
  };

  const CodeBlock = ({ code, variant }: { code: string, variant: 'old' | 'new' }) => (
    <div className={cn(
        "h-full w-full p-6 font-mono text-sm overflow-auto",
        variant === 'old' ? "bg-red-500/5 text-red-200/80" : "bg-green-500/5 text-green-200"
    )}>
        <pre className="whitespace-pre-wrap">{code}</pre>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto p-4 md:p-6 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                    <Github className="size-3" />
                    {project?.name || "No Project"}
                </Badge>
                <div className="size-1 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground font-mono">Main Branch</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AI Cloud Editor</h1>
            <p className="text-muted-foreground">
            Maintain your streak from anywhere. Describe a change, review the diff, and push to GitHub.
            </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="editor" className="gap-2">
              <Code className="size-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <HistoryIcon className="size-4" />
              AI Change History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="m-0 focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="size-4 text-primary" />
                    Describe Change
                  </CardTitle>
                  <CardDescription>What should the AI implement?</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Target File (Optional)</label>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between bg-background/50 border-primary/10"
                            disabled={!projectFiles || loading}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="size-3 text-muted-foreground" />
                              <span className="truncate">
                                {selectedFile || "Auto-match (Global Context)"}
                              </span>
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command className="bg-card">
                            <CommandInput placeholder="Search files..." />
                            <CommandList>
                              <CommandEmpty>No file found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setSelectedFile(undefined);
                                    setOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <Search className="size-3 opacity-50" />
                                    <span>Auto-match (Global Context)</span>
                                  </div>
                                </CommandItem>
                                {projectFiles?.map((file) => (
                                  <CommandItem
                                    key={file.fileName}
                                    value={file.fileName}
                                    onSelect={(currentValue) => {
                                      setSelectedFile(currentValue);
                                      setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileText className="size-3 opacity-50" />
                                      <span className="truncate">{file.fileName}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Textarea
                      placeholder="e.g., Add a dark mode toggle to the header component..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[120px] bg-background/50 resize-none focus:ring-primary/30"
                    />
                    <Button 
                      type="submit" 
                      disabled={loading || !prompt.trim() || !project?.id} 
                      className="w-full shadow-lg shadow-primary/10"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Engineering...
                        </>
                      ) : (
                        "Apply AI Agent"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {change && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Github className="size-4 text-green-500" />
                        Push to GitHub
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Commit Message</label>
                        <Textarea
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          className="text-sm min-h-[80px] bg-background/50"
                        />
                      </div>
                      <Button 
                        variant="default"
                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/10"
                        onClick={handleCommit}
                        disabled={committing || !commitMessage.trim()}
                      >
                        {committing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Pushing...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Commit & Push
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {!project?.id && (
                <div className="flex flex-col items-center justify-center p-8 border rounded-xl bg-muted/30 text-center">
                  <AlertCircle className="size-8 text-orange-500 mb-2" />
                  <p className="text-sm font-medium">No Project Selected</p>
                  <p className="text-xs text-muted-foreground mt-1">Select a project from the sidebar to use the Agent.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              <Card className="h-full border-muted/30 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col min-h-[500px]">
                <CardHeader className="border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="size-4 text-blue-500" />
                      {change?.prompt ? "Transformation Preview" : "AI Proposal"}
                    </CardTitle>
                    {change && (
                      <Badge variant="outline" className="bg-blue-500/5 text-blue-500 border-blue-500/30">
                        {change.fileName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden bg-[#0d1117] flex flex-col relative">
                  {change ? (
                    <Compare 
                      firstContent={<CodeBlock code={change.oldCode} variant="old" />}
                      secondContent={<CodeBlock code={change.newCode} variant="new" />}
                      className="flex-1"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground flex-col gap-4 p-8 text-center flex-1">
                      <div className="size-16 rounded-full bg-muted/20 flex items-center justify-center mb-2">
                        <BotIcon className="size-8 opacity-20" />
                      </div>
                      <p className="text-sm italic">"Waiting for your instructions... I'll analyze the repo and propose a change here."</p>
                    </div>
                  )}
                  {change && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <Badge variant="secondary" className="bg-black/80 backdrop-blur text-[10px] animate-bounce">
                            Slide to verify changes
                        </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="m-0 focus-visible:ring-0">
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HistoryIcon className="size-5 text-primary" />
                AI Transformation History
              </CardTitle>
              <CardDescription>Review past changes made by the AI Agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {aiHistory?.map((h) => (
                    <Card key={h.id} className="group hover:border-primary/40 transition-all cursor-pointer overflow-hidden" onClick={() => {
                        setChange(h);
                        setActiveTab("editor");
                    }}>
                      <div className="p-4 border-l-4 border-primary">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              {new Date(h.createdAt).toLocaleString()}
                              <span>•</span>
                              <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px]">{h.fileName}</Badge>
                            </div>
                            <h4 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1 italic">
                              "{h.prompt}"
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{h.commitMessage}</p>
                          </div>
                          {h.commitUrl && (
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                                e.stopPropagation();
                                window.open(h.commitUrl!, "_blank");
                            }}>
                              <ExternalLink className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {aiHistory?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground italic">
                      No AI changes found yet. Start by describing a change in the Editor!
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const BotIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

export default AgentPage;
