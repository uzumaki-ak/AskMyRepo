"use client";

import React from "react";
import useProject from "~/hooks/use-project";
import { SiGithubactions } from "react-icons/si";
import { TfiUnlink } from "react-icons/tfi";
import Link from "next/link";
import CommitLog from "./commit-log";
import AskQuesCard from "./ask-question-card";
import ReadmeGeneratorCard from "./readme-generator-card";
import { PetMascot } from "~/components/pet-mascot";
import { InviteModal } from "~/components/invite-modal";
import { Sketchboard } from "~/components/sketchboard";
import { Card, CardContent } from "~/components/ui/card";
import { Sparkles, PencilRuler, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const { project, projects } = useProject();

  if (!project?.id) {
    return (
      <div className="rounded-xl border border-dashed border-primary/30 bg-card/30 p-10 text-center">
        <h2 className="text-2xl font-bold tracking-tight">No project selected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {projects && projects.length > 0
            ? "Pick a project from the sidebar to view commits, Q&A, and analytics."
            : "Create your first project to start indexing your repository."}
        </p>
        <div className="mt-6">
          <Link
            href="/create"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Create Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-4">
        {/* github link here  */}
        <div className="w-fit rounded-lg bg-card border border-primary/20 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center">
            <SiGithubactions className="size-5 text-primary" />
            <div className="ml-2">
              <p className="font-mono text-sm text-muted-foreground/90">
                This project is linked to: {""}
                <Link
                  href={project?.githubUrl ?? ""}
                  className="inline-flex items-center text-primary hover:underline font-bold"
                >
                  {project?.githubUrl}
                  <TfiUnlink className="ml-3 size-4 text-primary/50" />
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <InviteModal projectId={project?.id ?? ""} />
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
          <div className="sm:col-span-4 space-y-6">
             <AskQuesCard />
             {/* Small shortcut to sketchboard instead of the whole thing */}
             <Card className="bg-background/40 border-primary/10 hover:border-primary/30 transition-all group overflow-hidden">
                <CardContent className="p-0">
                  <Link href="/notes" className="flex items-center justify-between p-4 px-6 h-full w-full">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <PencilRuler className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">Open Knowledge Grimoire</h3>
                        <p className="text-[11px] text-muted-foreground">Document patterns, blindspots, and interview insights.</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-all" />
                  </Link>
                </CardContent>
             </Card>
          </div>
          <div className="sm:col-span-2 space-y-6">
             <ReadmeGeneratorCard variant="compact" />
             <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Files</p>
                    <p className="text-xl font-black text-foreground">{project?.embeddingTotal ?? 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Commits</p>
                    <p className="text-xl font-black text-foreground">{(project as any)?._count?.commits ?? 0}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-8 bg-primary rounded-full" />
          <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
        </div>
        <CommitLog />
      </div>
      <PetMascot projectId={project?.id ?? ""} />
    </div>
  );
};

export default Dashboard;
