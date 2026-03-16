"use client";

import React, { useState } from 'react';
import { api } from "~/trpc/react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Edit2, Trash2, Send, PencilRuler, MoreHorizontal, Sparkles, Hash, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import useProject from "~/hooks/use-project";

interface SketchboardProps {
  projectId: string;
}

export const Sketchboard: React.FC<SketchboardProps> = ({ projectId }) => {
  const { user } = useUser();
  const { project } = useProject();
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const utils = api.useUtils();
  const { data: notes, isLoading } = api.notes.getNotes.useQuery({ projectId }, { enabled: !!projectId });

  const addNote = api.notes.addNote.useMutation({
    onSuccess: () => {
      setNewNote("");
      utils.notes.getNotes.invalidate();
      toast.success("Insight added to the grimoire.");
    },
  });

  const editNote = api.notes.editNote.useMutation({
    onSuccess: () => {
      setEditingId(null);
      utils.notes.getNotes.invalidate();
      toast.success("Insight updated.");
    },
  });

  const deleteNote = api.notes.deleteNote.useMutation({
    onSuccess: () => {
      utils.notes.getNotes.invalidate();
      toast.error("Insight removed.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote.mutate({ projectId, content: newNote });
  };

  const handleEditSave = (id: string) => {
    if (!editContent.trim()) return;
    editNote.mutate({ id, content: editContent });
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-primary/50 font-mono">Loading records...</div>;

  return (
    <div className="space-y-10 w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Input Section - Hero Style */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
        <Card className="relative border-white/5 bg-background/60 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-2xl border-t border-white/10">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="space-y-4 max-w-sm">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase">
                  <PencilRuler className="w-3.5 h-3.5" />
                  Insight Canvas
                </div>
                <h2 className="text-3xl font-black tracking-tight leading-none text-foreground">
                  New <span className="text-primary italic">Observation.</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium capitalize">
                  Document the technical invisible. Logic flows, blindspots, and interview gold.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 w-full space-y-4">
                <div className="relative">
                   <Textarea
                    placeholder="Capture a technical truth..."
                    className="min-h-[160px] bg-secondary/20 border-white/5 focus-visible:ring-primary/40 transition-all text-xl font-medium tracking-tight placeholder:text-muted-foreground/30 p-8 rounded-2xl resize-none"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground/20" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground cursor-pointer hover:bg-white/5">#CODE</Badge>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground cursor-pointer hover:bg-white/5">#LOGIC</Badge>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={addNote.isPending || !newNote.trim()}
                    className="h-14 px-8 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)]"
                  >
                    <span>Cast Insight</span>
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Results */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
           <Hash className="w-5 h-5 text-primary" />
           <h3 className="text-lg font-bold tracking-tight">The Recorded Timeline</h3>
           <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes?.map((note: any) => (
            <div key={note.id} className="animate-in fade-in zoom-in-95 duration-500">
               <Card className="h-full border-white/5 bg-background/40 hover:bg-background/60 hover:border-primary/20 transition-all backdrop-blur-md overflow-hidden group">
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 ring-2 ring-background ring-offset-2 ring-offset-primary/20">
                          <AvatarImage src={note.user.imageUrl || undefined} />
                          <AvatarFallback>{note.user.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-foreground leading-tight">{note.user.firstName} {note.user.lastName}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {(user?.id === note.userId || (project as any)?.userRole === 'ADMIN') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-2xl border-white/5">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingId(note.id);
                                setEditContent(note.content);
                              }}
                              className="gap-2 text-[11px] font-bold uppercase tracking-widest"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteNote.mutate({ id: note.id })}
                              className="gap-2 text-[11px] font-bold uppercase tracking-widest text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Purge Insight
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="relative">
                      {editingId === note.id ? (
                        <div className="space-y-3">
                          <Textarea
                            className="bg-secondary/40 border-primary/30 text-sm font-medium"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" className="text-[10px] font-bold uppercase rounded-lg" onClick={() => handleEditSave(note.id)}>Update Archiva</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <p className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap break-words italic">
                            "{note.content}"
                          </p>
                          <div className="absolute -bottom-2 right-0 opacity-0 group-hover:opacity-20 transition-opacity">
                            <Sparkles className="w-8 h-8" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
               </Card>
            </div>
          ))}
        </div>

        {notes?.length === 0 && (
          <div className="py-32 text-center space-y-6">
            <div className="w-24 h-24 rounded-[2rem] bg-primary/5 flex items-center justify-center mx-auto border border-white/5 shadow-2xl animate-pulse">
              <PencilRuler className="w-10 h-10 text-primary/30" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight">The grimoire is empty.</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">Begin your technical journey.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
