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
import { Loader2, RefreshCw, Zap, RotateCcw } from "lucide-react";

const CommitLog = () => {
  const { projectId, project } = useProject();
  const { data: commits } = api.project.getCommits.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const refetch = useRefetch();
  
  const sync = api.project.syncCommits.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to sync commits");
    }
  });

  const handleSync = (force = false) => {
    if (!projectId) return;
    sync.mutate({ projectId, force });
  };

  const resummarize = api.project.summarizeSingleCommit.useMutation({
    onSuccess: (data) => {
      toast.success("Summary regenerated!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to regenerate summary");
    }
  });

  const handleResummarize = (commitHash: string) => {
    if (!projectId) return;
    resummarize.mutate({ projectId, commitHash });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Recent commits
        </h2>
        <div className="flex gap-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSync(false)}
                disabled={!projectId || sync.isPending}
                className="h-8 border-primary/20 bg-background/50"
            >
                {sync.isPending && !sync.variables?.force ? <Loader2 className="mr-2 size-3 animate-spin" /> : <Zap className="mr-2 size-3 text-primary" />}
                Sync New
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSync(true)}
                disabled={!projectId || sync.isPending}
                className="h-8 text-orange-400 border-orange-500/20 bg-background/50 hover:bg-orange-500/10 hover:text-orange-300 transition-colors"
            >
                {sync.isPending && sync.variables?.force ? <Loader2 className="mr-2 size-3 animate-spin" /> : <RotateCcw className="mr-2 size-3" />}
                Full Refresh
            </Button>
        </div>
      </div>
      <ul className="space-y-8">
        {commits?.map((commit, commitIndx) => {
          const isFailed = !commit.summary || commit.summary === "Failed to generate summary";
          const isRegenerating = resummarize.isPending && resummarize.variables?.commitHash === commit.commitHash;

          return (
            <li key={commit.id} className="relative flex gap-x-4">
              <div
                className={cn(
                  commitIndx === commits.length - 1 ? "h-0" : "-bottom-6",
                  "absolute top-0 left-0 flex w-6 justify-center",
                )}
              >
                <div className="w-px translate-x-1 bg-border/40"></div>
              </div>
              <>
                <img
                  src={commit.commitAuthorAvatar}
                  alt="author avatar"
                  className="relative mt-4 size-8 flex-none rounded-full bg-zinc-900 border"
                />
                <div className="flex-auto rounded-xl bg-card border-border/40 p-4 shadow-sm ring-1 ring-primary/5">
                  <div className="flex justify-between gap-x-4">
                    <Link
                      target="_blank"
                      href={`${project?.githubUrl}/commits/${commit.commitHash}`}
                      className="py-0.5 text-xs leading-5"
                    >
                      <span className="font-medium text-primary hover:underline">
                        {commit.commitAuthorName}
                      </span>{" "}
                      <span className="inline-flex items-center text-muted-foreground opacity-70">
                        committed
                        <TfiUnlink className="m-1 size-3" />
                      </span>
                    </Link>
                    {isFailed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                        onClick={() => handleResummarize(commit.commitHash)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 size-3" />
                        )}
                        Regenerate
                      </Button>
                    )}
                  </div>
                  <span className="font-semibold text-red-400 block mt-1 tracking-tight">
                    {commit.commitMessage}
                  </span>
                  <pre className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-400 font-sans border-l-2 border-primary/10 pl-3 italic">
                    {isRegenerating ? "Regenerating summary..." : commit.summary}
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
