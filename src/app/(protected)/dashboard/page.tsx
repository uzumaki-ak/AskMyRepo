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

const Dashboard = () => {
  const { project } = useProject();
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

        <div className="h-4"></div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
             <AskQuesCard />
          </div>
          <div className="sm:col-span-2">
             <ReadmeGeneratorCard variant="compact" />
          </div>
        </div>
      </div>
      <div className="mt-8"></div>
      <CommitLog />
      <PetMascot projectId={project?.id ?? ""} />
    </div>
  );
};

export default Dashboard;
