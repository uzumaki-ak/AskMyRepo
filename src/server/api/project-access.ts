import { TRPCError } from "@trpc/server";
import type { PrismaClient, Role, UserToProject } from "@prisma/client";

type Membership = Pick<UserToProject, "userId" | "projectId" | "role">;

export async function requireProjectMembership(
  db: PrismaClient,
  userId: string,
  projectId: string,
): Promise<Membership> {
  const membership = await db.userToProject.findFirst({
    where: {
      userId,
      projectId,
      project: {
        deletedAt: null,
      },
    },
    select: {
      userId: true,
      projectId: true,
      role: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    });
  }

  return membership;
}

export async function requireProjectRole(
  db: PrismaClient,
  userId: string,
  projectId: string,
  role: Role,
): Promise<Membership> {
  const membership = await requireProjectMembership(db, userId, projectId);

  if (membership.role !== role) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Project ${role.toLowerCase()} access is required.`,
    });
  }

  return membership;
}
