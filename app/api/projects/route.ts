import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { validateProjectDirectory } from "@/lib/project-path";

// GET /api/projects — 获取当前用户所有项目
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(projects.updatedAt);

  return NextResponse.json(userProjects.reverse());
}

// POST /api/projects — 创建新项目
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, path, defaultModel } = body;

  if (!name || !path) {
    return NextResponse.json(
      { error: "name and path are required" },
      { status: 400 }
    );
  }

  let normalizedPath: string;
  try {
    normalizedPath = await validateProjectDirectory(path);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid project path" },
      { status: 400 }
    );
  }

  const now = new Date();
  const [newProject] = await db
    .insert(projects)
    .values({
      id: uuidv4(),
      name,
      path: normalizedPath,
      defaultModel: defaultModel || "claude-opus-4-5",
      userId: session.user.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(newProject, { status: 201 });
}
