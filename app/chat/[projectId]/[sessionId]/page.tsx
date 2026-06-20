"use client";

import { use, Suspense } from "react";
import { ChatArea } from "@/app/chat/[projectId]/page";
import { Loader2 } from "lucide-react";

interface SessionChatPageProps {
  params: Promise<{ projectId: string; sessionId: string }>;
}

export default function SessionChatPage({ params }: SessionChatPageProps) {
  const { projectId, sessionId } = use(params);
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ChatArea projectId={projectId} sessionId={sessionId} />
    </Suspense>
  );
}
