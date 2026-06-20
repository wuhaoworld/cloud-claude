import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectSessions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/projects/[id]/sessions — 获取项目下的会话列表
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  // 验证项目属于当前用户
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    )
    .limit(1);

  if (!project) {
    return NextResponse.json(
      { error: "Project not found or unauthorized" },
      { status: 404 }
    );
  }

  const sessions = await db
    .select()
    .from(projectSessions)
    .where(eq(projectSessions.projectId, projectId))
    .orderBy(desc(projectSessions.lastActiveAt));

  return NextResponse.json(sessions);
}
