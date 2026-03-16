import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const visualizerRouter = createTRPCRouter({
  getStructure: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          sourceCodeEmbeddings: {
            select: {
              fileName: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const files = project.sourceCodeEmbeddings.map((f) => f.fileName);
      
      const nodes: { id: string; name: string; type: 'file' | 'folder' }[] = [];
      const links: { source: string; target: string }[] = [];
      const folderSet = new Set<string>();

      files.forEach((file) => {
        const parts = file.split(/[/\\]/);
        let parent = "";

        parts.forEach((part, index) => {
          const currentPath = parts.slice(0, index + 1).join("/");
          const isFile = index === parts.length - 1;

          if (isFile) {
            nodes.push({ id: currentPath, name: part, type: 'file' });
          } else {
            if (!folderSet.has(currentPath)) {
              nodes.push({ id: currentPath, name: part, type: 'folder' });
              folderSet.add(currentPath);
            }
          }

          if (parent) {
            links.push({ source: parent, target: currentPath });
          }
          parent = currentPath;
        });
      });

      // deduplicate links
      const uniqueLinks = Array.from(new Set(links.map(l => `${l.source}|${l.target}`))).map(s => {
        const [source, target] = s.split('|');
        return { source: source!, target: target! };
      });

      return { nodes: Array.from(new Map(nodes.map(n => [n.id, n])).values()), links: uniqueLinks };
    }),

  saveDiagram: privateProcedure
    .input(z.object({ 
      projectId: z.string(), 
      chart: z.string(), 
      prompt: z.string().optional(),
      diagramType: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.mermaidDiagram.create({
        data: {
          projectId: input.projectId,
          userId: ctx.user.userId,
          chart: input.chart,
          prompt: input.prompt,
          diagramType: input.diagramType,
        }
      });
    }),

  getDiagramHistory: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.mermaidDiagram.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: 10
      });
    }),
});
