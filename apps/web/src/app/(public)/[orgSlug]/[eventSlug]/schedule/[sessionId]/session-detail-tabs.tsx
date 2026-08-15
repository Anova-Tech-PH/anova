"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, MessageCircle, HelpCircle } from "lucide-react";

type TabKey = "polls" | "chat" | "qa";

export function SessionDetailTabs({
  pollsContent,
  chatContent,
  qaContent,
  hasPolls,
  hasQA,
}: {
  pollsContent: ReactNode;
  chatContent: ReactNode;
  qaContent: ReactNode;
  hasPolls: boolean;
  hasQA: boolean;
}) {
  const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
    {
      key: "polls",
      label: "Polls",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: "chat",
      label: "Chat",
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      key: "qa",
      label: "Q&A",
      icon: <HelpCircle className="h-4 w-4" />,
    },
  ];

  // Default to chat if no polls
  const [activeTab, setActiveTab] = useState<TabKey>(
    hasPolls ? "polls" : "chat"
  );

  return (
    <div className="flex flex-col" style={{ height: "min(600px, 70vh)" }}>
      {/* Tab headers */}
      <div className="flex border-b shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "polls" && pollsContent}
        {activeTab === "chat" && chatContent}
        {activeTab === "qa" && qaContent}
      </div>
    </div>
  );
}
