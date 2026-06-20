"use client";

import { use } from "react";
import { ChatArea } from "@/app/chat/[projectId]/page";

interface SessionChatPageProps {
  params: Promise<{ projectId: string; sessionId: string }>;
}

export default function SessionChatPage({ params }: SessionChatPageProps) {
  const { projectId, sessionId } = use(params);
  return <ChatArea projectId={projectId} sessionId={sessionId} />;
}
