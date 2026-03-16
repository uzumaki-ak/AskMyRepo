"use client"

import React, { useState } from 'react'
import { api } from '~/trpc/react'
import useProject from '~/hooks/use-project'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Loader2, Activity, ShieldCheck, Zap, Layers, AlertTriangle, History as HistoryIcon } from 'lucide-react'
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const AuditPage = () => {
  const { projectId } = useProject()
  const [auditData, setAuditData] = useState<any>(null)

  const history = api.audit.getHistory.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  )

  const auditMut = api.audit.performAudit.useMutation({
    onSuccess: (data) => {
      setAuditData(data)
      toast.success("Health audit complete!")
      history.refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const loadFromHistory = (data: any) => {
    setAuditData(data)
    toast.success("Loaded from history!")
  }

  const chartData = auditData ? [
    { subject: 'Complexity', A: auditData.complexity, fullMark: 100 },
    { subject: 'Documentation', A: auditData.documentation, fullMark: 100 },
    { subject: 'Modernity', A: auditData.modernity, fullMark: 100 },
    { subject: 'Maintainability', A: auditData.maintainability, fullMark: 100 },
  ] : []

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> Health Audit
          </h1>
          <p className="text-muted-foreground italic">Get a high-level view of your project's technical health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Radar Chart */}
        <Card className="lg:col-span-3 h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle>Technical Debt Radar</CardTitle>
            <CardDescription>A visual representation of code quality metrics.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-0">
            {auditData ? (
               <div className="w-full h-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Health"
                      dataKey="A"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
                <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
                    <div className="size-16 bg-muted rounded-full flex items-center justify-center">
                        <Activity className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-bold">No data yet</h3>
                    <p className="text-sm text-muted-foreground">Run a health audit to analyze code patterns and calculate technical debt scores.</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Action & Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-lg">Run Diagnosis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground italic">
                        The AI will scan your code structure to look for complexity, outdated patterns, and documentation gaps.
                    </p>
                    <Button 
                        className="w-full h-12 font-bold"
                        onClick={() => auditMut.mutate({ projectId: projectId ?? "" })}
                        disabled={auditMut.isPending}
                    >
                        {auditMut.isPending ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2 size-4" />}
                        Perform Full Health Audit
                    </Button>

                    {history.data && history.data.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-muted-foreground">
                                <HistoryIcon className="size-3" /> Audit History
                            </h4>
                            <div className="flex flex-col gap-2">
                                {history.data.map((item: any) => (
                                    <Button 
                                        key={item.id}
                                        variant="outline"
                                        size="sm"
                                        className="justify-start text-[10px] h-8 truncate"
                                        onClick={() => loadFromHistory(item)}
                                    >
                                        {new Date(item.createdAt).toLocaleDateString()} - Maintainability: {item.maintainability}%
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
          </Card>

          <AnimatePresence>
            {auditData && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                             <ShieldCheck className="text-green-500" /> Executive Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed">{auditData.summary}</p>
                    </CardContent>
                 </Card>

                 <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 flex flex-col items-center justify-center text-center">
                        <Layers className="size-5 text-blue-500 mb-2" />
                        <div className="text-2xl font-bold">{auditData.maintainability}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Maintainability</div>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="size-5 text-orange-500 mb-2" />
                        <div className="text-2xl font-bold">{auditData.complexity}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Complexity</div>
                    </Card>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default AuditPage
