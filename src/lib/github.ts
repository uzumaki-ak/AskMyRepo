import { Octokit } from 'octokit'
import { db } from '~/server/db';
import axios from 'axios'
import { aiSummariseCommit } from './gemini';
import 'dotenv/config'

const createOctokit = (token?: string) => {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
  })
}

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (
  githubUrl: string,
  token?: string,
): Promise<Response[]> => {
  const cleanUrl = githubUrl.trim().replace(/\/$/, "");
  const parts = cleanUrl.split('/');
  const repo = parts.pop();
  const owner = parts.pop();
  
  if(!owner || !repo) {
    throw new Error ("Invalid GitHub URL format. Please use 'https://github.com/owner/repo'")
  }

  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: 20 // Slightly more for better coverage
  });

  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() -
      new Date(a.commit.author.date).getTime(),
  ) as any[];

  return sortedCommits.map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    commitDate: commit.commit?.author?.date ?? "",
  }));
}

export const pollCommits = async (projectId: string, token?: string, force = false) => {
  const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl, token);
  
  // If force is true, we don't filter, effectively regenerating all (up to limit)
  const unprocessedCommits = force 
    ? commitHashes 
    : await filterUnprocessedCommits(projectId, commitHashes);
  
  if (unprocessedCommits.length === 0) {
    return { count: 0, message: "No new commits to sync." };
  }

  const commitsToProcess = unprocessedCommits.slice(0, 10); // Process up to 10 at once
  const summaries: string[] = [];
  
  for (const commit of commitsToProcess) {
    try {
      const summary = await summariseCommit(
        githubUrl,
        commit.commitHash,
        token,
      );
      summaries.push(summary);
    } catch (err) {
      console.error(`Error summarising commit ${commit.commitHash}:`, err);
      summaries.push("Could not generate summary.");
    }
    // Rate limit delay
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // If force, we might need to update existing ones or delete old ones.
  // For simplicity, we'll use upsert logic or delete and re-create.
  if (force) {
    // Delete existing commits that we are about to re-process to avoid primary key issues
    const hashesToReProcess = commitsToProcess.map(c => c.commitHash);
    await db.commit.deleteMany({
      where: {
        projectId,
        commitHash: { in: hashesToReProcess }
      }
    });
  }

  const commits = await db.commit.createMany({
    data: summaries.map((summary, index) => ({
      projectId: projectId,
      commitHash: commitsToProcess[index]!.commitHash,
      commitMessage: commitsToProcess[index]!.commitMessage,
      commitAuthorName: commitsToProcess[index]!.commitAuthorName,
      commitAuthorAvatar: commitsToProcess[index]!.commitAuthorAvatar,
      commitDate: commitsToProcess[index]!.commitDate,
      summary
    }))
  });

  return { 
    count: commits.count, 
    message: force ? `Successfully regenerated ${commits.count} commits.` : `Successfully synced ${commits.count} new commits.`
  };
}

export async function summariseCommit(githubUrl: string, commitHash: string, token?: string) {
  const cleanUrl = githubUrl.trim().replace(/\/$/, "");
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.diff',
  }
  if (token) {
    headers.Authorization = `token ${token}`
  } else if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
  }
  
  const { data } = await axios.get(`${cleanUrl}/commit/${commitHash}.diff`, { headers })
  return await aiSummariseCommit(data) || ""
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { githubUrl: true, name: true },
  });

  if (!project) {
    throw new Error("Project not found."); 
  }
  if (!project.githubUrl) {
    throw new Error(`GitHub URL missing for project "${project.name}".`); 
  }
  return { project, githubUrl: project.githubUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
    select: { commitHash: true }
  });

  const processedHashes = new Set(processedCommits.map(c => c.commitHash));

  return commitHashes.filter(
    (commit) => !processedHashes.has(commit.commitHash)
  );
}
