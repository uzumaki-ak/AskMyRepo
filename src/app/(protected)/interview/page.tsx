"use client"

import React, { useMemo, useState } from 'react'
import { api } from '~/trpc/react'
import useProject from '~/hooks/use-project'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Textarea } from '~/components/ui/textarea'
import { 
  Loader2, 
  BrainCircuit, 
  CheckCircle2, 
  ChevronRight, 
  History as HistoryIcon, 
  MessageSquare, 
  HelpCircle, 
  Eye, 
  EyeOff,
  Send,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'

const InterviewPrepPage = () => {
  const { project } = useProject()
  const projectId = project?.id ?? ""
  
  const [questions, setQuestions] = useState<{ question: string, answer: string }[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [customFocus, setCustomFocus] = useState("")
  
  // Doubt Chat State
  const [userDoubt, setUserDoubt] = useState("")
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [isAsking, setIsAsking] = useState(false)

  const history = api.interview.getHistory.useQuery(
    { projectId },
    { enabled: !!projectId }
  )
  const { data: streakCommits } = api.project.getCommits.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const streakDays = useMemo(() => {
    if (!streakCommits || streakCommits.length === 0) return 0;

    const dateSet = new Set(
      streakCommits.map((commit) =>
        new Date(commit.commitDate).toISOString().slice(0, 10),
      ),
    );

    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    const todayKey = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(todayKey)) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [streakCommits]);

  const generate = api.interview.generateQuestions.useMutation({
    onSuccess: (data) => {
      setQuestions(data)
      setCurrentIdx(0)
      setShowAnswer(false)
      setChatMessages([])
      toast.success("Questions generated!")
      history.refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const askDoubt = api.interview.askDoubt.useMutation({
    onSuccess: (response) => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
      setIsAsking(false)
      setUserDoubt("")
    },
    onError: (error) => {
      toast.error(error.message)
      setIsAsking(false)
    }
  })

  const loadFromHistory = (qs: any[]) => {
    setQuestions(qs)
    setCurrentIdx(0)
    setShowAnswer(false)
    setChatMessages([])
    toast.success("Loaded from history!")
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setShowAnswer(false)
      setChatMessages([])
    }
  }

  const handlePrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1)
      setShowAnswer(false)
      setChatMessages([])
    }
  }

  const handleAskDoubt = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userDoubt.trim() || isAsking) return
    
    const currentQ = questions[currentIdx]
    if (!currentQ) return

    const newMessage: { role: 'user', content: string } = { role: 'user', content: userDoubt }
    setChatMessages(prev => [...prev, newMessage])
    setIsAsking(true)

    askDoubt.mutate({
      projectId,
      question: currentQ.question,
      answer: currentQ.answer,
      userDoubt: userDoubt
    })
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-primary size-8" /> Interview Prep
          </h1>
          <p className="text-muted-foreground italic">Master your repository's logic with AI-powered deep dives.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Question/Interaction Area */}
        <div className="lg:col-span-8 space-y-4">
          <AnimatePresence mode="wait">
            {questions.length === 0 ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="min-h-[450px] flex flex-col items-center justify-center p-8 bg-card/50 backdrop-blur-sm border-dashed border-2">
                  <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Zap className="size-10 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-center">Customize Your Session</h3>
                  <p className="text-muted-foreground max-w-sm mb-8 text-center">
                    Generate challenging technical questions tailored to your project. Add a custom focus to drill down into specific areas.
                  </p>
                  
                  <div className="w-full max-w-md space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Focus Area (Optional)</label>
                      <Textarea 
                        placeholder="e.g. Focus on authentication logic, database schema, or Prisma middleware..."
                        value={customFocus}
                        onChange={(e) => setCustomFocus(e.target.value)}
                        className="bg-background/50 h-24 resize-none"
                      />
                    </div>
                    
                    <Button 
                      className="w-full h-12 text-lg shadow-lg shadow-primary/20" 
                      onClick={() => generate.mutate({ projectId, customPrompt: customFocus })}
                      disabled={generate.isPending || !projectId}
                    >
                      {generate.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing Repository...
                        </>
                      ) : (
                        "Launch AI Interviewer"
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="active-session"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Question Card */}
                <Card className="overflow-hidden border-primary/20 shadow-xl bg-card/80">
                  <div className="bg-primary/5 border-b p-4 flex justify-between items-center text-xs font-bold tracking-widest text-primary uppercase">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="size-4" />
                      Step {currentIdx + 1} of {questions.length}
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-default">
                      Technical Assessment
                    </Badge>
                  </div>
                  <CardContent className="p-8 md:p-12 min-h-[250px] flex flex-col justify-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-center leading-tight tracking-tight">
                      {questions[currentIdx]?.question}
                    </h2>
                  </CardContent>
                  
                  <div className="px-6 py-4 bg-muted/30 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handlePrevious} 
                            disabled={currentIdx === 0}
                            className="flex-1 md:flex-none"
                        >
                            Previous
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleNext} 
                            disabled={currentIdx === questions.length - 1}
                            className="flex-1 md:flex-none"
                        >
                            Next <ChevronRight className="ml-1 size-4" />
                        </Button>
                    </div>
                    
                    <Button 
                      variant={showAnswer ? "outline" : "default"}
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="w-full md:w-auto gap-2"
                    >
                      {showAnswer ? <><EyeOff className="size-4" /> Hide Solution</> : <><Eye className="size-4" /> Reveal AI Solution</>}
                    </Button>
                  </div>
                </Card>

                <AnimatePresence>
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <Card className="border-green-500/20 bg-green-500/5 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="bg-green-500/10 border-b py-3 px-6">
                            <CardTitle className="text-sm font-bold text-green-700 flex items-center gap-2">
                                <CheckCircle2 className="size-4" />
                                Model Solution & File Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{questions[currentIdx]?.answer}</ReactMarkdown>
                        </CardContent>
                      </Card>

                      {/* Doubt Chat */}
                      <Card className="border-primary/20 bg-card/50 overflow-hidden shadow-lg">
                        <CardHeader className="bg-primary/5 py-3 px-6 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <MessageSquare className="size-4 text-primary" />
                                Ask a Follow-up Doubt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col h-[400px]">
                            <ScrollArea className="flex-1 overflow-y-auto">
                                <div className="p-6">
                                    {chatMessages.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground italic text-sm">
                                            Not clear on the answer? Ask for a breakdown or more examples.
                                        </div>
                                    ) : (
                                        chatMessages.map((msg, i) => (
                                            <div key={i} className={cn(
                                                "flex flex-col gap-1 max-w-[85%]",
                                                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                                            )}>
                                                <div className={cn(
                                                    "px-4 py-3 rounded-2xl text-sm",
                                                    msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted border rounded-tl-none prose prose-sm dark:prose-invert"
                                                )}>
                                                    {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {isAsking && (
                                        <div className="flex gap-2 items-center text-muted-foreground text-xs animate-pulse">
                                            <BrainCircuit className="size-3" /> AI is thinking...
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            
                            <form onSubmit={handleAskDoubt} className="p-4 bg-muted/50 border-t flex gap-2">
                                <input 
                                    className="flex-1 bg-background border rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    placeholder="Ask for clarification..."
                                    value={userDoubt}
                                    onChange={(e) => setUserDoubt(e.target.value)}
                                    disabled={isAsking}
                                />
                                <Button size="icon" type="submit" disabled={!userDoubt.trim() || isAsking}>
                                    <Send className="size-4" />
                                </Button>
                            </form>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex justify-center pt-8">
                    <Button variant="ghost" className="text-muted-foreground hover:text-red-500 gap-2" onClick={() => setQuestions([])}>
                        End Session & Start New
                    </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section: Sidebar / History */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 font-black italic">
                  TIPS POUR SUCCÈS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {[
                { n: 1, t: "Structure", p: "Analyze the **data flow** between files before formulating your response." },
                { n: 2, t: "Context", p: "Cite specific **variable names or components** found in the code." },
                { n: 3, t: "Edges", p: "Think about **fail-safes**: what happens when the DB is offline?" }
              ].map((tip) => (
                <div key={tip.n} className="flex gap-3 group">
                   <div className="size-6 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-all">
                      {tip.n}
                   </div>
                   <div className="space-y-1">
                      <p className="font-bold uppercase text-[10px] tracking-widest text-primary/70">{tip.t}</p>
                      <p className="text-muted-foreground leading-snug">{tip.p}</p>
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <AnimatePresence>
            {history.data && history.data.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="border-primary/10 bg-muted/10">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                                <HistoryIcon className="size-4" /> Historical Analysis Layers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {history.data.map((set: any) => (
                                <Button 
                                    key={set.id}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start text-[10px] h-10 truncate bg-card hover:bg-primary/5 hover:border-primary/30 transition-all"
                                    onClick={() => loadFromHistory(set.questions as any[])}
                                >
                                    <div className="flex flex-col items-start truncate">
                                        <span className="font-bold">{new Date(set.createdAt).toLocaleDateString()} AT {new Date(set.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="text-muted-foreground">{set.questions.length || 0} DEEP-DIVE SHARDS</span>
                                    </div>
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
          </AnimatePresence>

          <Card className="overflow-hidden border-primary/40 shadow-lg relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="size-4 text-primary" /> Developer Streak
              </CardTitle>
              <CardDescription>Consistency is the mother of mastery.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-black tracking-tighter text-primary">🔥 {streakDays} DAYS</div>
              <div className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Growth in progress...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default InterviewPrepPage
