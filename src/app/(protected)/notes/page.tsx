"use client";

import React from 'react';
import useProject from "~/hooks/use-project";
import { Sketchboard } from "~/components/sketchboard";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Sparkles, PencilRuler } from "lucide-react";
import Link from "next/link";

export default function NotesPage() {
  const { project, projectId } = useProject();

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="w-fit hover:bg-secondary/50">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">Back to Dashboard</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PencilRuler className="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {project?.name ? `${project.name} Knowledge Grimoire` : "Knowledge Grimoire"}
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                Capture logic, blindspots, and interview insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-background/40 backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden min-h-[600px]">
         <div className="h-full w-full p-6 md:p-10">
            <Sketchboard projectId={projectId ?? ""} />
         </div>
      </div>
    </div>
  );
}
