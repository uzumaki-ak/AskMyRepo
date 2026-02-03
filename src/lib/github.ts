// import {Octokit} from 'octokit'
// import { db } from '~/server/db';
// import axios from 'axios'
// import { aiSummariseCommit } from './gemini';
// import 'dotenv/config'

// export const octokit = new Octokit({
//   auth: process.env.GITHUB_TOKEN,
// })


// // export function createOctokitInstance(token?: string) {
// //   return new Octokit({
// //     auth: token || process.env.GITHUB_TOKEN,
// //   });
// // }

// const githubUrl = 'https://github.com/docker/genai-stack'


// type Response = {
//   commitHash: string;
//   commitMessage: string;
//   commitAuthorName: string;
//   commitAuthorAvatar: string;
//   commitDate: string;
// };

// export const getCommitHashes = async (
//   githubUrl: string,
// ): Promise<Response[]> => {
//   const [owner, repo] = githubUrl.split('/').slice(-2)
// if(!owner || !repo) {
//   throw new Error ("Inavlid Url (!owner || !repo)🤡")
// }

//   const { data } = await octokit.rest.repos.listCommits({
//     owner,
//     repo
//   });

// // export const getCommitHashes = async (
// //   githubUrl: string,
// //   token?: string
// // ): Promise<Response[]> => {
// //   const [owner, repo] = githubUrl.split('/').slice(-2);

// //   if (!owner || !repo) throw new Error("Invalid GitHub URL");

// //   const octokit = createOctokitInstance(token);

// //   const { data } = await octokit.rest.repos.listCommits({ owner, repo });
//   const sortedCommits = data.sort(
//     (a: any, b: any) =>
//       new Date(b.commit.author.date).getTime() -
//       new Date(a.commit.author.date).getTime(),
//   ) as any[];

//   return sortedCommits.slice(0, 10).map((commit: any) => ({
//     commitHash: commit.sha as string,
//     commitMessage: commit.commit.message ?? "",
//     commitAuthorName: commit.commit?.author?.name ?? "",
//     commitAuthorAvatar: commit?.author?.avatar_url ?? "",
//     commitDate: commit.commit?.author?.date ?? "",
//   }));

  
// }

// // console.log(await getCommitHashes(githubUrl))


// // export const pollCommits = async (projectId: string) => {
// //   const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
// //   const commitHashes = await getCommitHashes(githubUrl);

// export const pollCommits = async (projectId: string, token?: string) => {
//   const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
//   const commitHashes = await getCommitHashes(githubUrl, token);
//   const unprocessedCommits = await filterUnprocessedCommits(
//     projectId,
//     commitHashes,
//   );
//   // console.log(unprocessedCommits);
  
  
//   const summaryResponses = await Promise.allSettled(unprocessedCommits.map(commit => {
//     return summariseCommit(githubUrl, commit.commitHash)
//   }))
//   const summaries = summaryResponses.map((response) => {
//     if (response.status === "fulfilled" && typeof response.value === "string") {
//       return response.value;
//     }
//     return ""
//   })

//   const commits = await db.commit.createMany({

//     data: summaries.map((summary,index) => {
//       // console.log(`processing commits ${index}`);
      
//       // console.log(`processing commmits ${index}`);
      
//       return {
//         projectId : projectId,
//         commitHash: unprocessedCommits[index]!.commitHash,
//         commitMessage: unprocessedCommits[index]!.commitMessage,
//         commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
//         commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
//         commitDate: unprocessedCommits[index]!.commitDate,
//         summary
//       }
//     })
//   })
//   return commits
// }


// async function summariseCommit(githubUrl:string , commitHash: string) {
//   const {data} = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
//     headers: {
//       Accept: 'application/vnd.github.v3.diff'
//     }
//   })
//   return await aiSummariseCommit(data) || ""
//   }


// async function fetchProjectGithubUrl(projectId: string) {
//   const project = await db.project.findUnique({
//     where: { id: projectId },
//     select: { githubUrl: true },
//   });

//   if (!project) {
//     throw new Error("Project not found. Create it first."); // Clear error
//   }
//   if (!project.githubUrl) {
//     throw new Error("GitHub URL missing. Update project settings."); // Actionable
//   }
//   return { project, githubUrl: project?.githubUrl };
// }


// async function filterUnprocessedCommits(
//   projectId: string,
//   commitHashes: Response[],
// ) {
//   const processedCommits = await db.commit.findMany({
//     where: { projectId },
//   });

//   const unprocessedCommits = commitHashes.filter(
//     (commit) =>
//       !processedCommits.some(
//         (processedCommit) => processedCommit.commitHash === commit.commitHash,
//       ),
//   );
//   return unprocessedCommits;
// }

// // await pollCommits('cm97hg4uw0000tyz45ykh6zre').then(console.log)



import {Octokit} from 'octokit'
import { db } from '~/server/db';
import axios from 'axios'
import { aiSummariseCommit } from './gemini';
import 'dotenv/config'

const createOctokit = (token?: string) => {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
  })
}

const githubUrl = 'https://github.com/uzumaki-ak/portfollio'


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
  const [owner, repo] = githubUrl.split('/').slice(-2)
if(!owner || !repo) {
  throw new Error ("Inavlid Url (!owner || !repo)🤡")
}

  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo
  });
  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() -
      new Date(a.commit.author.date).getTime(),
  ) as any[];

  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    commitDate: commit.commit?.author?.date ?? "",
  }));

  
}

// console.log(await getCommitHashes(githubUrl))


export const pollCommits = async (projectId: string, token?: string) => {
  const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl, token);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );
  // console.log(unprocessedCommits);
  
  
  const commitsToProcess = unprocessedCommits.slice(0, 5)
  const summaries: string[] = []
  for (const commit of commitsToProcess) {
    try {
      const summary = await summariseCommit(
        githubUrl,
        commit.commitHash,
        token,
      )
      summaries.push(summary)
    } catch {
      summaries.push("")
    }
    await new Promise((resolve) => setTimeout(resolve, 12000))
  }

  const commits = await db.commit.createMany({

    data: summaries.map((summary,index) => {
      // console.log(`processing commits ${index}`);
      
      // console.log(`processing commmits ${index}`);
      
      return {
        projectId : projectId,
        commitHash: commitsToProcess[index]!.commitHash,
        commitMessage: commitsToProcess[index]!.commitMessage,
        commitAuthorName: commitsToProcess[index]!.commitAuthorName,
        commitAuthorAvatar: commitsToProcess[index]!.commitAuthorAvatar,
        commitDate: commitsToProcess[index]!.commitDate,
        summary
      }
    })
  })
  return commits
}


export async function summariseCommit(githubUrl:string , commitHash: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.diff',
  }
  if (token) {
    headers.Authorization = `token ${token}`
  }
  const {data} = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, { headers })
  return await aiSummariseCommit(data) || ""
  }


async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { githubUrl: true },
  });

  if (!project) {
    throw new Error("Project not found. Create it first."); // Clear error
  }
  if (!project.githubUrl) {
    throw new Error("GitHub URL missing. Update project settings."); // Actionable
  }
  return { project, githubUrl: project?.githubUrl };
}


async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });

  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit) => processedCommit.commitHash === commit.commitHash,
      ),
  );
  return unprocessedCommits;
}

// await pollCommits('cm97hg4uw0000tyz45ykh6zre').then(console.log)
