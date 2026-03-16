"use client";

import React from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FileText, Download, Copy, Check, Hash, List, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LiveReadmeViewProps {
  content: string;
  projectName?: string;
}

export const LiveReadmeView: React.FC<LiveReadmeViewProps> = ({ content, projectName }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("README downloaded!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Table of Contents / Sidebar (Sticky) */}
      <div className="hidden lg:block lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <Card className="bg-background/40 backdrop-blur-md border-white/5 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <List className="w-4 h-4 text-primary" />
                Contents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3">
              <div className="text-xs text-muted-foreground space-y-2">
                {/* Dynamically extract headers if needed, for now just placeholders */}
                <div className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer transition-colors">
                  <Hash className="w-3 h-3 text-primary/50" />
                  Introduction
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer transition-colors">
                  <Hash className="w-3 h-3 text-primary/50" />
                  Quick Start
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer transition-colors">
                  <Hash className="w-3 h-3 text-primary/50" />
                  Documentation
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 backdrop-blur-md">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-1">
                <Sparkles className="w-3 h-3" />
                AI Enhanced
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                This README is dynamically generated using repository intelligence. It updates as your code evolves.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main README Content */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border-none shadow-2xl bg-background/50 backdrop-blur-xl border-t border-white/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-4 px-6 md:px-8">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold tracking-tight">
                  {projectName || 'Project'} README
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-primary/30 text-primary">Live Update</Badge>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                    <Info className="w-2 h-2" /> Synced with main
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={handleCopy} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleDownload} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-12">
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Optional: Custom styling for markdown elements
                  h1: ({node, ...props}) => <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight border-b border-white/10 pb-4 mb-8 text-foreground" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-bold tracking-tight mt-12 mb-6 text-primary/90" {...props} />,
                  code: ({node, ...props}) => <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-sm leading-none" {...props} />,
                  pre: ({node, ...props}) => <pre className="bg-muted/50 p-6 rounded-xl border border-white/5 overflow-x-auto my-6 shadow-inner" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/40 pl-6 italic my-8 text-muted-foreground" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
