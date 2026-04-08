import React from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { useLocalStorage } from "usehooks-ts";

const useProject = () => {
  const { userId } = useAuth();
  const storageKey = userId
    ? `gitgod-projectId:${userId}`
    : "gitgod-projectId:anonymous";
  const { data: projects } = api.project.getProjects.useQuery();
  const [projectId, setProjectId] = useLocalStorage(storageKey, "", {
    initializeWithValue: false,
  });

  const project = projects?.find((current) => current.id === projectId);

  React.useEffect(() => {
    if (!projects) return;

    if (projects.length === 0) {
      if (projectId) setProjectId("");
      return;
    }

    const hasCurrent = projects.some((current) => current.id === projectId);
    if (!hasCurrent) {
      setProjectId(projects[0]?.id ?? "");
    }
  }, [projects, projectId, setProjectId]);

  return {
    projects,
    project,
    projectId,
    setProjectId,
  };
};

export default useProject;
