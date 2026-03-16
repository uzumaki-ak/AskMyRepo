"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { ArrowLeft, FileText } from "lucide-react";
import ReadmeGeneratorCard from "../dashboard/readme-generator-card";
import useProject from "~/hooks/use-project";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { LiveReadmeView } from "~/components/live-readme";

export default function ReadmePage() {
  const { project, projectId } = useProject();
  const { data: readme } = api.readme.get.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="w-fit hover:bg-secondary/50">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">Back to Dashboard</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {project?.name ? `${project.name} Documentation` : "Project Documentation"}
              </h1>
              <p className="text-muted-foreground text-sm">
                Generated and refined by GitGod Intelligence.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <ReadmeGeneratorCard variant="compact" />
        </div>
      </div>

      <div className="w-full">
        {readme?.content ? (
          <LiveReadmeView content={readme.content} projectName={project?.name} />
        ) : (
          <Card className="border-dashed border-2 bg-muted/20 py-20">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No README Found</h3>
                <p className="text-sm text-muted-foreground">Generate one to visualize your project's story.</p>
              </div>
              <ReadmeGeneratorCard variant="full" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
