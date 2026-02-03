"use client";

// import { useUser } from "@clerk/nextjs";
import React from "react";
import useProject from "~/hooks/use-project";
import { SiGithubactions } from "react-icons/si";
import { TfiUnlink } from "react-icons/tfi";
import Link from "next/link";
import CommitLog from "./commit-log";
import AskQuesCard from "./ask-question-card";

const Dashboard = () => {
  const { project } = useProject();
  return (
    <div>
      {project?.id}
      <div className="flex flex-wrap items-center justify-between gap-y-4">
        {/* github link here  */}
        <div className="w-fit rounded-lg bg-gray-800 px-4 py-3">
          <div className="flex items-center">
            <SiGithubactions className="size-5 text-zinc-50" />
            <div className="ml-2">
              <p className="font-mono text-sm text-white/80">
                Dis Proj is Linked to: {""}
                <Link
                  href={project?.githubUrl ?? ""}
                  className="inline-flex items-center text-pink-500 hover:underline"
                >
                  {project?.githubUrl}
                  <TfiUnlink className="ml-3 size-4 text-blue-400" />
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="h-4"></div>
        <div className="flex items-center gap-4">
          {project?.id}
          team members invitebutton archive button
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <AskQuesCard />
          meeting card
        </div>
      </div>
      <div className="mt-8"></div>
      <CommitLog />
    </div>
  );
};

export default Dashboard;
