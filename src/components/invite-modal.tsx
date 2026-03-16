"use client";

import React, { useState } from 'react';
import { api } from "~/trpc/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { UserPlus, Ghost, Shield, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InviteModalProps {
  projectId: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({ projectId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const inviteMutation = api.collaboration.inviteTeammate.useMutation({
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl || null);
      toast.success(`Invitation created for ${email}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create invitation");
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({ projectId, email, role });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/10 transition-all">
          <UserPlus className="w-4 h-4" />
          Invite Teammate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-lg border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Expand the Pantheon
          </DialogTitle>
          <DialogDescription>
            Invite a developer to collaborate on this repository. Generate a secure link to share with them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Teammate's Email</Label>
            <Input
              id="email"
              placeholder="e.g. dev@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50 border-white/5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Permission Level</Label>
            <Select value={role} onValueChange={(val: any) => setRole(val)}>
              <SelectTrigger className="bg-background/50 border-white/5">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-background/90 backdrop-blur-md border-white/10">
                <SelectItem value="MEMBER">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Member (Can edit, but restricted stats)</span>
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Admin (Full access & inviting)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            {inviteUrl ? (
              <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-primary">Invitation Link</p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteUrl} className="bg-background/50 h-9 text-xs" />
                    <Button 
                      type="button"
                      size="sm" 
                      onClick={() => {
                        void navigator.clipboard.writeText(inviteUrl);
                        toast.success("Link copied!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full text-xs"
                  onClick={() => {
                    setInviteUrl(null);
                    setEmail("");
                  }}
                >
                  Invite Another
                </Button>
              </div>
            ) : (
              <Button 
                type="submit" 
                className="w-full gap-2 font-semibold shadow-lg shadow-primary/10"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ghost className="w-4 h-4" />
                )}
                Generate Invite Link
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
