"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Brain, Database, HelpCircle, Send, Sparkles, Terminal } from "lucide-react";
import React, { useState } from "react";

// Custom light markdown table and text parser to render LLM responses beautifully
function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const parsedElements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (tableRows.length === 0 && tableHeaders.length === 0) return null;
    const table = (
      <div key={`table-${key}`} className="overflow-x-auto my-6 border border-white/10 rounded-xl glass shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {tableHeaders.map((h, i) => (
                <th key={i} className="p-4 text-xs font-bold text-primary uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tableRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
                {row.map((col, ci) => (
                  <td key={ci} className="p-4 text-sm font-medium text-white/95">{col}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableHeaders = [];
    tableRows = [];
    inTable = false;
    return table;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("|")) {
      const cols = line.split("|").map(c => c.trim()).filter((_, index, arr) => index > 0 && index < arr.length - 1);
      if (cols.every(c => c.startsWith("-"))) continue;
      if (!inTable) {
        inTable = true;
        tableHeaders = cols;
      } else {
        tableRows.push(cols);
      }
      continue;
    } else {
      if (inTable) {
        const table = flushTable(i);
        if (table) parsedElements.push(table);
      }
    }

    if (line.startsWith("### ")) {
      parsedElements.push(<h4 key={i} className="text-md font-bold text-white/95 mt-4 mb-2">{line.replace("### ", "")}</h4>);
    } else if (line.startsWith("## ")) {
      parsedElements.push(<h3 key={i} className="text-lg font-bold text-primary mt-6 mb-3 border-b border-white/5 pb-2">{line.replace("## ", "")}</h3>);
    } else if (line.startsWith("# ")) {
      parsedElements.push(<h2 key={i} className="text-xl font-black text-white mt-8 mb-4">{line.replace("# ", "")}</h2>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const listContent = line.replace(/^[-*]\s+/, "");
      parsedElements.push(
        <li key={i} className="ml-6 list-disc text-sm text-muted-foreground my-1 leading-relaxed">
          {renderInlineBold(listContent)}
        </li>
      );
    } else if (line.length > 0) {
      parsedElements.push(
        <p key={i} className="text-sm text-muted-foreground my-2.5 leading-relaxed font-medium">
          {renderInlineBold(line)}
        </p>
      );
    }
  }

  if (inTable) {
    const table = flushTable(lines.length);
    if (table) parsedElements.push(table);
  }

  return <div className="space-y-1">{parsedElements}</div>;
}

function renderInlineBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="text-white font-bold">{part}</strong>;
    }
    return part;
  });
}

const suggestions = [
  "Show active complaints grouped by their category",
  "Find available vehicles in Sector 4",
  "Compare worker ratings and tasks completed in a table",
  "Which ward has the most unresolved complaints?",
  "Draft a safety SOP summary for chemical hazardous waste"
];

export default function SwachhAIPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchPrompt: string) => {
    if (!searchPrompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setQuery(searchPrompt);

    try {
      const response = await fetch("/api/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchPrompt }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with AI endpoint.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Swachh AI Workspace</h2>
          </div>
          <p className="text-muted-foreground mt-2">
            Stateful multi-agent orchestrator, municipal RAG protocols, and semantic aggregation queries.
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left Side: Control Bar and Suggestions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Ask Swachh Assistant
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ask questions in plain English to query live workers, vehicles, safety rules, or compile custom reports.
            </p>

            {/* Input Bar */}
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about active wards, vehicle inventory, worker stats..."
                className="w-full min-h-[100px] text-sm bg-white/5 border border-white/10 rounded-xl p-3 pr-10 focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder-white/30 resize-none font-medium"
              />
              <button
                onClick={() => handleSearch(query)}
                disabled={loading || !query.trim()}
                className="absolute right-2 bottom-3 p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Queries */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              Quick Analytics Prompts
            </h4>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(s)}
                  disabled={loading}
                  className="text-left text-xs font-medium bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-xl p-3 text-muted-foreground hover:text-white transition-all truncate"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Fixed Height Output Window */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col h-[610px]">

            {/* Window Top Bar */}
            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest ml-3">
                  AI AGENT TERMINAL
                </span>
              </div>
              {result?.collection && (
                <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-[10px] text-primary font-mono uppercase font-bold">
                  <Database className="w-3 h-3" />
                  Collection: {result.collection}
                </div>
              )}
            </div>

            {/* Results Body — fixed height, scrolls inside */}
            <div className="flex-1 min-h-0 p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <AnimatePresence mode="wait">

                {/* 1. Loading State */}
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center space-y-6 py-12"
                  >
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse"></div>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-cyan-400 border border-white/20 flex items-center justify-center shadow-inner relative overflow-hidden animate-spin duration-3000">
                        <div className="absolute w-6 h-6 bg-white/45 rounded-full blur-sm top-2 left-3"></div>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-semibold tracking-wide text-white">Swachh AI compiles search aggregation...</p>
                      <p className="text-xs text-muted-foreground font-mono">Executing secure text-to-aggregation pipeline...</p>
                    </div>
                  </motion.div>
                )}

                {/* 2. Error State */}
                {error && !loading && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 text-red-400 text-sm font-medium items-start"
                  >
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Execution Failed</p>
                      <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* 3. Empty State */}
                {!loading && !result && !error && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-3 py-16 text-muted-foreground"
                  >
                    <Terminal className="w-12 h-12 text-white/10" />
                    <p className="text-sm font-medium">Ready for Semantic Aggregations</p>
                    <p className="text-xs max-w-sm leading-relaxed">
                      Select one of the suggestion prompts or type your request in the control bar to fetch live MongoDB insights.
                    </p>
                  </motion.div>
                )}

                {/* 4. Display Results */}
                {result && !loading && !error && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {result.pipeline && result.pipeline.length > 0 && (
                      <details className="glass border border-white/5 rounded-xl overflow-hidden group">
                        <summary className="px-4 py-2.5 bg-white/5 text-[10px] font-mono text-muted-foreground group-open:text-white cursor-pointer select-none font-bold uppercase tracking-wider flex items-center justify-between">
                          <span>🔍 Dynamic MongoDB Aggregation Pipeline</span>
                          <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded uppercase font-normal">Details</span>
                        </summary>
                        <pre className="p-4 text-[10px] font-mono bg-[#09090b] overflow-x-auto text-cyan-400 select-all border-t border-white/5 rounded-b-xl custom-scrollbar leading-relaxed max-h-[160px]">
                          {JSON.stringify(result.pipeline, null, 2)}
                        </pre>
                      </details>
                    )}

                    <div className="prose prose-invert max-w-none text-white/90">
                      <MarkdownRenderer content={result.markdown} />
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}