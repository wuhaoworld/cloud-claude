import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectSessions, chatMessages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/projects/[id]/sessions/[sessionId]/messages — 获取会话的消息历史
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, sessionId } = await params;

  // 验证项目归属
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // 验证会话归属
  const [sess] = await db
    .select()
    .from(projectSessions)
    .where(
      and(
        eq(projectSessions.sessionId, sessionId),
        eq(projectSessions.projectId, projectId)
      )
    )
    .limit(1);

  if (!sess) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.sortOrder));

  return NextResponse.json(messages);
}
