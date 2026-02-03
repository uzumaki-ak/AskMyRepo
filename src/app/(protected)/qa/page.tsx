"use client";

import React from "react";
import AskQuesCard from "../dashboard/ask-question-card";
import useProject from "~/hooks/use-project";
import { api } from "~/trpc/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

const QANDA = () => {
  const { projectId } = useProject();
  const { data: saved } = api.question.list.useQuery(
    { projectId: projectId || "" },
    { enabled: !!projectId },
  );
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = saved?.find((q) => q.id === selectedId);
  const fileRefs = (selected?.fileReferences as any[]) || [];
  const tabsValue = fileRefs[0]?.fileName;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <AskQuesCard />

      <div className="rounded-md border bg-white p-4 shadow">
        <h2 className="text-sm font-semibold text-zinc-700">Saved Questions</h2>
        <div className="mt-3 max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {saved?.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setOpen(true);
              }}
              className="w-full rounded-md border bg-zinc-50 p-3 text-left hover:bg-zinc-100"
            >
              <div className="text-sm font-medium text-zinc-800">
                {item.question}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
          {saved?.length === 0 && (
            <div className="text-sm text-zinc-500">No saved questions yet.</div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[860px] w-[92vw] h-[72vh] p-0 overflow-hidden flex flex-col">
          <div className="border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle>Saved Answer</DialogTitle>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="text-sm leading-6 whitespace-pre-wrap text-zinc-800">
              {selected?.answer ?? ""}
            </div>
            <div className="mt-4 min-h-0">
              <h3 className="text-sm font-semibold text-zinc-700">
                File References
              </h3>
              {fileRefs.length === 0 ? (
                <p className="text-sm text-zinc-500">No matching files found.</p>
              ) : (
                <Tabs defaultValue={tabsValue} className="min-w-0">
                  <TabsList className="flex max-w-full flex-nowrap overflow-x-auto">
                    {fileRefs.map((file) => (
                      <TabsTrigger key={file.fileName} value={file.fileName}>
                        {file.fileName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {fileRefs.map((file) => (
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
    </div>
  );
};

export default QANDA
