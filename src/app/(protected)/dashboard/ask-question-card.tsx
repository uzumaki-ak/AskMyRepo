"use client";

import Image from "next/image";
import React from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import useProject from "~/hooks/use-project";
import { askQuestion } from "./actions";
import { readStreamableValue } from "ai/rsc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Progress } from "~/components/ui/progress";

const AskQuesCard = () => {
  const { project } = useProject();
  const [open, setOpen] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [filesRefrences, setFilesRefrences] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = React.useState("");
  const [askedQuestion, setAskedQuestion] = React.useState("");
  const saveAnswer = api.question.save.useMutation();
  const { data: embeddingStatus } = api.project.getEmbeddingStatus.useQuery(
    { projectId: project?.id ?? "" },
    {
      enabled: !!project?.id,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (!status) return 0;
        return status === "indexing" || status === "partial"
          ? 5000
          : 0;
      },
    },
  );
  const utils = api.useUtils();
  const reindexEmbeddings = api.project.reindexEmbeddings.useMutation({
    onSuccess: async () => {
      toast.success("Embeddings reindexed.");
      await utils.project.getEmbeddingStatus.invalidate({
        projectId: project?.id ?? "",
      });
    },
    onError: (error) => {
      toast.error(`Reindex failed: ${error.message}`);
    },
  });
  const warnedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!project?.id || !embeddingStatus) return;
    if (warnedRef.current === project.id) return;
    warnedRef.current = project.id;
    if (embeddingStatus.status === "complete") {
      toast.success(
        `Embeddings ready (${embeddingStatus.indexed}/${embeddingStatus.total}).`,
      );
    } else if (embeddingStatus.status === "partial") {
      toast.error(
        `Embeddings partial (${embeddingStatus.indexed}/${embeddingStatus.total}). Reindex to finish.`,
      );
    } else if (embeddingStatus.status === "failed") {
      toast.error(
        "Embeddings failed. Please reindex or check your API key/model.",
      );
    } else if (!embeddingStatus.hasEmbeddings) {
      toast.error(
        "Embeddings not ready for this project yet. Ask will likely fail until indexing finishes.",
      );
    }
  }, [project?.id, embeddingStatus]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project?.id) return;
    setAnswer("");
    setFilesRefrences([]);
    setLoading(true);
    setOpen(true);

    setAskedQuestion(question);
    const { output, filesRefrences } = await askQuestion(question, project.id);
    setFilesRefrences(filesRefrences);

    let gotDelta = false;
    for await (const delta of readStreamableValue(output)) {
      gotDelta = true;
      setAnswer((ans) => ans + (delta ?? ""));
    }
    if (!gotDelta) {
      setAnswer("No answer could be generated. Please try again.");
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (!project?.id || !answer.trim()) return;
    saveAnswer.mutate(
      {
        projectId: project.id,
        question: askedQuestion,
        answer,
        fileReferences: filesRefrences,
      },
      {
        onSuccess: () => {
          toast.success("Answer saved to Q&A");
        },
        onError: () => {
          toast.error("Failed to save answer");
        },
      },
    );
  };

  const tabsValue = filesRefrences[0]?.fileName;
  const totalFiles = embeddingStatus?.total ?? 0;
  const indexedFiles = embeddingStatus?.indexed ?? embeddingStatus?.count ?? 0;
  const progressValue =
    totalFiles > 0 ? Math.round((indexedFiles / totalFiles) * 100) : 0;
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[860px] w-[92vw] h-[72vh] p-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle>
                <Image src="/gitgodlogo.jpg" alt="logo" width={40} height={40} className="rounded-md" />
              </DialogTitle>
            </DialogHeader>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSave}
              disabled={!answer.trim() || saveAnswer.isPending}
            >
              {saveAnswer.isPending ? "Saving..." : "Save Answer"}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Answer
              </h2>
              <div className="mt-2 max-h-40 overflow-auto text-sm leading-6 whitespace-pre-wrap text-foreground italic">
                {loading && !answer ? "Thinking..." : answer || "No answer yet."}
              </div>
            </div>
            <div className="mt-4 min-h-0 min-w-0">
              <h3 className="text-sm font-semibold text-muted-foreground">
                File References
              </h3>
              {filesRefrences.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">No matching files found.</p>
              ) : (
                <Tabs defaultValue={tabsValue} className="min-w-0">
                  <TabsList className="flex max-w-full flex-nowrap overflow-x-auto">
                    {filesRefrences.map((file) => (
                      <TabsTrigger
                        key={file.fileName}
                        value={file.fileName}
                        className="shrink-0"
                      >
                        {file.fileName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {filesRefrences.map((file) => (
                    <TabsContent key={file.fileName} value={file.fileName}>
                      <pre className="mt-2 max-h-60 max-w-full overflow-x-auto overflow-y-auto whitespace-pre rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                        {file.sourceCode}
                      </pre>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Card className="relative col-span-3">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-orange-600">Ask A question</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {embeddingStatus && (
              <Badge
                variant={
                  embeddingStatus.status === "complete" ? "secondary" : "outline"
                }
              >
                {embeddingStatus.status === "complete"
                  ? `Indexed ${indexedFiles}/${totalFiles}`
                  : embeddingStatus.status === "partial"
                    ? `Partial ${indexedFiles}/${totalFiles}`
                    : embeddingStatus.status === "failed"
                      ? "Indexing failed"
                      : embeddingStatus.status === "indexing"
                        ? `Indexing ${indexedFiles}/${totalFiles}`
                        : "Not indexed"}
              </Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                !project?.id ||
                reindexEmbeddings.isPending ||
                embeddingStatus?.status === "indexing"
              }
              onClick={() => {
                if (!project?.id) return;
                reindexEmbeddings.mutate({ projectId: project.id });
              }}
            >
              {reindexEmbeddings.isPending ? "Reindexing..." : "Reindex Embeddings"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {embeddingStatus && totalFiles > 0 && (
            <div className="mb-4 space-y-2">
              <div className="text-muted-foreground text-xs">
                Indexed {indexedFiles} of {totalFiles} files
              </div>
              <Progress value={progressValue} />
              {embeddingStatus.lastError && (
                <p className="text-xs text-red-600">
                  {embeddingStatus.lastError}
                </p>
              )}
            </div>
          )}
          <form onSubmit={onSubmit}>
            <Textarea
              placeholder="which file should i edit to change her Feeling toward me?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className=""
            />
            <div className="h-4"></div>
            <Button type="submit">Query AskRepo !!</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuesCard;
