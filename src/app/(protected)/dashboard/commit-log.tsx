"use client";
import Link from "next/link";
import React from "react";
import useProject from "~/hooks/use-project";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { TfiUnlink } from "react-icons/tfi";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import useRefetch from "~/hooks/use-refetch";

const CommitLog = () => {
  const { projectId, project } = useProject();
  const { data: commits } = api.project.getCommits.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const refetch = useRefetch();
  const resummarize = api.project.resummarizeCommits.useMutation();

  const handleResummarize = () => {
    if (!project?.id) return;
    resummarize.mutate(
      { projectId: project.id },
      {
        onSuccess: (data) => {
          const msg = data.stoppedForQuota
            ? `Re-summarized ${data.updated} of ${data.attempted} (stopped for quota)`
            : `Re-summarized ${data.updated} of ${data.attempted} commits`;
          toast.success(msg);
          refetch();
        },
        onError: () => {
          toast.error("Failed to re-summarize commits");
        },
      },
    );
  };
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">
          Recent commits
        </h2>
        <Button
          type="button"
          onClick={handleResummarize}
          disabled={!project?.id || resummarize.isPending}
          className="h-8"
        >
          {resummarize.isPending ? "Re-summarizing..." : "Re-summarize failed"}
        </Button>
      </div>
      <ul className="space-y-8">
        {commits?.map((commit, commitIndx) => {
          return (
            <li key={commit.id} className="relative flex gap-x-4">
              <div
                className={cn(
                  commitIndx === commits.length - 1 ? "h-0" : "-bottom-6",
                  "absolute top-0 left-0 flex w-6 justify-center",
                )}
              >
                <div className="w-px translate-x-1 bg-gray-200"></div>
              </div>
              <>
                <img
                  src={commit.commitAuthorAvatar}
                  alt="author avatar"
                  className="relative mt-4 size-8 flex-none rounded-full bg-zinc-50"
                />
                <div className="flex-auto rounded-md bg-zinc-50 p-3 ring-1 ring-pink-100 ring-inset">
                  <div className="flex justify-between gap-x-4">
                    <Link
                      target="_blank"
                      href={`${project?.githubUrl}/commits/${commit.commitHash}`}
                      className="py-0.5 text-xs leading-5 text-shadow-orange-200"
                    >
                      <span className="font-medium text-emerald-400 underline hover:text-blue-600">
                        {commit.commitAuthorName}
                      </span>{" "}
                      <span className="inline-flex items-center text-pink-500">
                        committed
                        <TfiUnlink className="m-1 size-4 text-cyan-400" />
                      </span>
                    </Link>
                  </div>
                  <span className="font-sans text-red-600">
                    {commit.commitMessage}
                  </span>
                  <pre className="mt-2 text-sm leading-6 whitespace-pre-wrap text-fuchsia-400">
                    {commit.summary}
                  </pre>
                </div>
              </>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default CommitLog;
