"use client"

import React, { useState } from 'react'
import { api } from '~/trpc/react'
import useProject from '~/hooks/use-project'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Search, History, Loader2, Calendar, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'

const ArchaeologyPage = () => {
  const { projectId } = useProject()
  const [query, setQuery] = useState("")
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [commits, setCommits] = useState<any[]>([])

  const search = api.history.search.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.answer)
      setCommits(data.commits)
    }
  })

  const { data: recentCommits, isLoading: isLoadingRecent } = api.history.getCommits.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId && commits.length === 0 }
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return
    search.mutate({ projectId: projectId ?? "", query })
  }

  const displayCommits = commits.length > 0 ? commits : (recentCommits ?? [])

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="text-primary" /> Code Archaeology
          </h1>
          <p className="text-muted-foreground italic">Search through the layers of your project's history.</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-primary/20 shadow-md">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search historical changes (e.g., 'When did we add the fallback logic?')..." 
              className="pl-10 h-12"
            />
          </div>
          <Button className="h-12 px-8" type="submit" disabled={search.isPending}>
            {search.isPending ? <Loader2 className="animate-spin" /> : "Dig"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Archaeology scans your synced commits to find architectural shifts and logic changes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/10 rounded-xl p-6 prose prose-sm dark:prose-invert max-w-none"
              >
                <div className="flex items-center gap-2 mb-4 text-primary font-bold uppercase text-xs tracking-widest">
                  <MessageCircle className="size-4" /> AI Historical Analysis
                </div>
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Calendar className="size-4" /> 
              {commits.length > 0 ? `Results for "${query}"` : "Recent Layers"}
            </h3>
            
            {isLoadingRecent ? (
               <div className="flex justify-center p-12"><Loader2 className="animate-spin size-8 text-primary" /></div>
            ) : displayCommits.length > 0 ? (
               <div className="space-y-3">
                  {displayCommits.map((commit) => (
                    <Card key={commit.id} className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-4 flex gap-4">
                        <img src={commit.commitAuthorAvatar} alt="" className="size-10 rounded-full border" />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold leading-none">{commit.commitMessage}</h4>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
                              {commit.commitHash.slice(0, 7)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{commit.commitAuthorName}</span>
                            <span>•</span>
                            <span>{format(new Date(commit.commitDate), 'MMM d, yyyy')}</span>
                          </div>
                          {commit.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 bg-muted/30 p-2 rounded italic">
                              {commit.summary}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
               </div>
            ) : (
                <div className="text-center p-12 border-dashed border-2 rounded-xl text-muted-foreground">
                  No artifacts found in this layer.
                </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">History Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                  <span className="text-sm">Indexed Layers</span>
                  <span className="font-bold">{recentCommits?.length ?? 0}</span>
               </div>
               <div className="text-xs text-muted-foreground p-2">
                  Code Archaeology helps you identify why decisions were made, not just what changed.
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ArchaeologyPage
