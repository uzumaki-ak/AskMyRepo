"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import ReadmeGeneratorCard from "../dashboard/readme-generator-card";
import useProject from "~/hooks/use-project";
import { Button } from "~/components/ui/button";

export default function ReadmePage() {
  const { project } = useProject();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1">Back to Dashboard</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-5 w-5" />
            <h1 className="text-xl font-semibold">
              {project?.name ? `${project.name} README` : "Project README"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Generate, refine, and download a README for your project.
          </p>
        </div>
      </div>

      <ReadmeGeneratorCard variant="full" />
    </div>
  );
}
