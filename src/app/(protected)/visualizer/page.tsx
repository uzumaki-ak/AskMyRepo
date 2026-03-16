"use client"

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import useProject from '~/hooks/use-project'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Loader2, GitBranch, Share2, Network, Wand2, Info } from 'lucide-react'
import { toast } from 'sonner'
import Mermaid from '~/components/mermaid'

import { Download, Copy } from 'lucide-react'
import { useTheme } from 'next-themes'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const VisualizerPage = () => {
  const { projectId, project } = useProject()
  const { theme } = useTheme()
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] } | null>(null)
  const [mermaidChart, setMermaidChart] = useState<string>("")
  const [customFlowPrompt, setCustomFlowPrompt] = useState("")
  const fgRef = React.useRef<any>(null)

  const getStructure = api.visualizer.getStructure.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId, refetchOnWindowFocus: false }
  )

  const handleDownload = () => {
    if (!fgRef.current) return;
    const canvas = fgRef.current.getCanvasElement();
    const link = document.createElement('a');
    link.download = `repo-dna-${project?.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success("Image downloaded!");
  };

  const handleShare = async () => {
    if (!fgRef.current) return;
    const canvas = fgRef.current.getCanvasElement();
    try {
      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) return;
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        toast.success("Image copied to clipboard!");
      });
    } catch (err) {
      toast.error("Failed to copy image");
    }
  };

  const history = api.visualizer.getDiagramHistory.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  )

  const saveMut = api.visualizer.saveDiagram.useMutation({
    onSuccess: () => history.refetch()
  })

  const generateFlow = api.readme.generateMermaid.useMutation({
    onSuccess: (data) => {
      const cleaned = data.diagram.replace(/```mermaid|```/g, "").trim()
      setMermaidChart(cleaned)
      toast.success("Logic flow generated!")
      
      // Auto-save the generated diagram
      saveMut.mutate({
        projectId: projectId ?? "",
        chart: cleaned,
        diagramType: "flow",
        prompt: customFlowPrompt
      })
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  useEffect(() => {
    if (getStructure.data) {
      setGraphData(getStructure.data)
    }
  }, [getStructure.data])

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="text-primary" /> Repo DNA
          </h1>
          <p className="text-muted-foreground italic">Map out your repository's structure and logic.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Structure Graph */}
        <Card className="flex flex-col h-[600px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Share2 className="size-5" /> Project Structure
              </CardTitle>
              <CardDescription>Force-directed map of files and folders.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="size-8" onClick={handleShare} title="Copy as Image">
                    <Copy className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={handleDownload} title="Download as PNG">
                    <Download className="size-4" />
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => getStructure.refetch()}
                    disabled={getStructure.isFetching}
                    className="h-8"
                >
                    {getStructure.isFetching ? <Loader2 className="animate-spin size-4" /> : <GitBranch className="size-4" />}
                </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative bg-muted/20">
            {graphData ? (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeAutoColorBy="type"
                nodeLabel="name"
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={d => 0.005}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                  const isDark = theme === 'dark';
                  
                  // Node Color
                  if (node.type === 'folder') {
                    ctx.fillStyle = isDark ? '#60a5fa' : '#3b82f6'; // Bright blue in dark, primary blue in light
                  } else {
                    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'; // Silver in dark, Slate 500 in light
                  }

                  ctx.beginPath(); 
                  ctx.arc(node.x, node.y, node.type === 'folder' ? 5 : 3, 0, 2 * Math.PI, false); 
                  ctx.fill();

                  // Text Label
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a'; // Near white in dark, near black in light
                  ctx.fillText(label, node.x, node.y + (node.type === 'folder' ? 10 : 7));

                  node.__bckgDimensions = bckgDimensions; // to use in nodePointerAreaPaint
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="animate-spin size-8 mb-4" />
                <p>Analyzing file connections...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logical System Flow */}
        <Card className="flex flex-col h-[600px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Wand2 className="size-5" /> System Logic Flow
            </CardTitle>
            <CardDescription>AI-generated logic diagrams for your repository.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div className="flex-1 bg-muted/20 rounded-lg border border-dashed flex items-center justify-center overflow-auto p-4 relative">
              {mermaidChart ? (
                <Mermaid chart={mermaidChart} />
              ) : (
                <div className="text-center space-y-4 max-w-sm">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                    <Share2 className="size-8 text-primary" />
                  </div>
                  <h3 className="font-bold">No logic map yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Hit generate to let AI analyze how your components work together (e.g., Auth flow, Data persistence).
                  </p>
                </div>
              )}
              {generateFlow.isPending && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-20">
                   <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin size-10 text-primary" />
                    <p className="font-bold animate-pulse">Architecting logic flow...</p>
                   </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded flex-1">
                   <Info className="size-3 shrink-0" />
                   <span>AI will generate a <strong>flowchart</strong> based on your file summaries.</span>
                </div>
                {history.data && history.data.length > 0 && (
                    <select 
                      className="ml-2 text-xs bg-muted border rounded p-1"
                      onChange={(e) => setMermaidChart(e.target.value)}
                      defaultValue=""
                    >
                        <option value="" disabled>Load History...</option>
                        {history.data.map((d: any) => (
                            <option key={d.id} value={d.chart}>
                                {new Date(d.createdAt).toLocaleDateString()} - {d.prompt || "Default"}
                            </option>
                        ))}
                    </select>
                )}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Focus on (e.g. 'auth flow', 'database integration')..." 
                  value={customFlowPrompt}
                  onChange={(e) => setCustomFlowPrompt(e.target.value)}
                />
                <Button 
                   onClick={() => generateFlow.mutate({ projectId: projectId ?? "", diagramType: "flow" })}
                   disabled={generateFlow.isPending || !projectId}
                >
                  Generate Flow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VisualizerPage
