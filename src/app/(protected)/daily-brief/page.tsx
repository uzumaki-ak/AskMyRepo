"use client"

import React, { useState } from 'react'
import { api } from '~/trpc/react'
import useProject from '~/hooks/use-project'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Loader2, Radio, Play, Pause, Newspaper, Calendar, History as HistoryIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'

const DailyBriefPage = () => {
  const { projectId } = useProject()
  const [script, setScript] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const history = api.briefing.getHistory.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  )

  const generate = api.briefing.generate.useMutation({
    onSuccess: (data) => {
      setScript(data.script)
      toast.success("Daily brief generated!")
      history.refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const loadFromHistory = (val: string) => {
    setScript(val)
    toast.success("Loaded from history!")
  }

  const togglePlayback = () => {
    if (!script) return
    
    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
    } else {
      const utterance = new SpeechSynthesisUtterance(script.replace(/[#*`]/g, ''))
      utterance.onend = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radio className="text-primary" /> Daily Brief
          </h1>
          <p className="text-muted-foreground italic">Your repository's daily newsroom. Sit back and listen to what's new.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {!script ? (
            <motion.div
              key="generate"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
                <div className="p-12 flex flex-col items-center text-center space-y-6">
                  <div className="size-20 bg-primary rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                    <Newspaper size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Ready for your briefing?</h2>
                    <p className="text-muted-foreground max-w-sm">
                      I'll analyze the last 10 commits and generate an engaging "podcast script" summarizing the project's progress.
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    className="px-12 h-14 text-lg font-bold"
                    onClick={() => generate.mutate({ projectId: projectId ?? "" })}
                    disabled={generate.isPending}
                  >
                    {generate.isPending ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" />
                        Writing script...
                      </>
                    ) : "Generate Briefing"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="shadow-2xl border-primary/20">
                <CardHeader className="bg-primary text-primary-foreground flex flex-row items-center justify-between py-4">
                  <div className="flex flex-col">
                    <CardTitle className="text-xl">Project Newsroom</CardTitle>
                    <CardDescription className="text-primary-foreground/70 flex items-center gap-1">
                      <Calendar size={12} /> {new Date().toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full size-12 shadow-inner"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                </CardHeader>
                <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown>{script}</ReactMarkdown>
                </CardContent>
              </Card>

              <div className="flex flex-col items-center gap-4">
                {history.data && history.data.length > 0 && (
                    <div className="w-full flex justify-center gap-2 overflow-x-auto py-2">
                        {history.data.map((item: any) => (
                            <Button 
                                key={item.id}
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] whitespace-nowrap"
                                onClick={() => loadFromHistory(item.script)}
                            >
                                <HistoryIcon className="size-3 mr-1" /> {item.date}
                            </Button>
                        ))}
                    </div>
                )}
                <Button variant="ghost" onClick={() => setScript(null)}>
                  Discard and Refresh
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default DailyBriefPage
