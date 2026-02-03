"use client";

import Image from "next/image";
import React from "react";
import { Button } from "~/components/ui/button";
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
    { enabled: !!project?.id },
  );
  const warnedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!project?.id || !embeddingStatus) return;
    if (warnedRef.current === project.id) return;
    warnedRef.current = project.id;
    if (!embeddingStatus.hasEmbeddings) {
      toast.error(
        "Embeddings not ready for this project yet. Ask will likely fail until indexing finishes.",
      );
    } else {
      toast.success(
        `Embeddings ready (${embeddingStatus.count} files indexed).`,
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
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[860px] w-[92vw] h-[72vh] p-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle>
                <Image src="/favicon.ico" alt="logo" width={40} height={40} />
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
              <h2 className="text-sm font-semibold text-zinc-700">
                Answer
              </h2>
              <div className="mt-2 max-h-40 overflow-auto text-sm leading-6 whitespace-pre-wrap text-zinc-800">
                {loading && !answer ? "Thinking..." : answer || "No answer yet."}
              </div>
            </div>
            <div className="mt-4 min-h-0 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-700">
                File References
              </h3>
              {filesRefrences.length === 0 ? (
                <p className="text-sm text-zinc-500">No matching files found.</p>
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
        <CardHeader>
          <CardTitle className="text-orange-600">Ask A question</CardTitle>
        </CardHeader>
        <CardContent>
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
