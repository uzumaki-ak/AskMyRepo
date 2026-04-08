"use client";

import React from 'react';
import useProject from "~/hooks/use-project";
import { Sketchboard } from "~/components/sketchboard";
import { Button } from "~/components/ui/button";
import { ArrowLeft, NotebookPen } from "lucide-react";
import Link from "next/link";

export default function NotesPage() {
  const { project, projectId } = useProject();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="w-fit hover:bg-secondary/50">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">Back to Dashboard</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <NotebookPen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {project?.name ? `${project.name} Notes` : "Project Notes"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Write and organize technical notes with markdown-style editing.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-[600px] flex-1 overflow-hidden rounded-xl border bg-card">
         <div className="h-full w-full p-4 md:p-6">
            <Sketchboard projectId={projectId ?? ""} />
         </div>
      </div>
    </div>
  );
}
