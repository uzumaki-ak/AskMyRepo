import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { projectRouter } from "./routers/project";
import { questionRouter } from "./routers/question";
import { readmeRouter } from "./routers/readme";
import { apiKeysRouter } from "./routers/apiKeys";
import { agentRouter } from "./routers/agent";
import 'dotenv/config'
import { interviewRouter } from "./routers/interview";

import { visualizerRouter } from "./routers/visualizer";
import { historyRouter } from "./routers/history";
import { briefingRouter } from "./routers/briefing";
import { auditRouter } from "./routers/audit";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  project: projectRouter,
  question: questionRouter,
  readme: readmeRouter,
  apiKeys: apiKeysRouter,
  interview: interviewRouter,
  visualizer: visualizerRouter,
  history: historyRouter,
  briefing: briefingRouter,
  audit: auditRouter,
  agent: agentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
