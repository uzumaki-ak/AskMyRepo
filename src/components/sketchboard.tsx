"use client";

import React, { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import {
  Code2,
  Edit2,
  Heading1,
  Link2,
  List,
  MoreHorizontal,
  Quote,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useProject from "~/hooks/use-project";
import { api } from "~/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface SketchboardProps {
  projectId: string;
}

export const Sketchboard: React.FC<SketchboardProps> = ({ projectId }) => {
  const { user } = useUser();
  const { project } = useProject();
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const utils = api.useUtils();
  const { data: notes, isLoading } = api.notes.getNotes.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const addNote = api.notes.addNote.useMutation({
    onSuccess: async () => {
      setNewNote("");
      await utils.notes.getNotes.invalidate();
      toast.success("Note saved.");
    },
  });

  const editNote = api.notes.editNote.useMutation({
    onSuccess: async () => {
      setEditingId(null);
      setEditContent("");
      await utils.notes.getNotes.invalidate();
      toast.success("Note updated.");
    },
  });

  const deleteNote = api.notes.deleteNote.useMutation({
    onSuccess: async () => {
      await utils.notes.getNotes.invalidate();
      toast.success("Note deleted.");
    },
  });

  const insertMarkdown = (before: string, after = "", fallback = "text") => {
    const textarea = editorRef.current;
    if (!textarea) {
      setNewNote((current) => `${current}${before}${fallback}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newNote.slice(start, end);
    const text = selectedText || fallback;
    const updated = `${newNote.slice(0, start)}${before}${text}${after}${newNote.slice(end)}`;

    setNewNote(updated);
    requestAnimationFrame(() => {
      const selectionStart = start + before.length;
      const selectionEnd = selectionStart + text.length;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newNote.trim()) return;
    addNote.mutate({ projectId, content: newNote.trim() });
  };

  const handleEditSave = (id: string) => {
    if (!editContent.trim()) return;
    editNote.mutate({ id, content: editContent.trim() });
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a project to start writing notes.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading notes...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Editor</CardTitle>
          <CardDescription>
            Tiptap-style markdown workflow: write on the left, preview on the right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => insertMarkdown("# ", "", "Heading")}>
                <Heading1 className="mr-1 h-4 w-4" />
                Heading
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("- ", "", "List item")}
              >
                <List className="mr-1 h-4 w-4" />
                Bullet
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => insertMarkdown("`", "`", "code")}>
                <Code2 className="mr-1 h-4 w-4" />
                Inline Code
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("> ", "", "Quoted insight")}
              >
                <Quote className="mr-1 h-4 w-4" />
                Quote
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("[", "](https://example.com)", "link text")}
              >
                <Link2 className="mr-1 h-4 w-4" />
                Link
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Textarea
                ref={editorRef}
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Document architecture decisions, interview points, bugs, and TODOs..."
                className="min-h-[260px] resize-y"
              />

              <div className="min-h-[260px] rounded-md border bg-muted/20 p-4">
                {newNote.trim() ? (
                  <div className="prose prose-sm max-w-none break-words text-foreground dark:prose-invert prose-code:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{newNote}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Live preview appears here.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={addNote.isPending || !newNote.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Save Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Saved Notes</CardTitle>
          <CardDescription>
            {notes?.length ?? 0} note{(notes?.length ?? 0) === 1 ? "" : "s"} in{" "}
            {project?.name ?? "this project"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes?.map((note) => {
            const canEdit = user?.id === note.userId || project?.userRole === "ADMIN";
            const authorName = [note.user.firstName, note.user.lastName].filter(Boolean).join(" ") || "Teammate";

            return (
              <div key={note.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={note.user.imageUrl ?? undefined} />
                      <AvatarFallback>{authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingId(note.id);
                            setEditContent(note.content);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteNote.mutate({ id: note.id })}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>

                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      className="min-h-[140px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleEditSave(note.id)}>
                        <Save className="mr-2 h-4 w-4" />
                        Update
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none break-words text-foreground dark:prose-invert prose-code:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}

          {notes?.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No notes yet. Add your first one above.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
