"use client";

import Link from "next/link";
import { MessageCircle, ArrowUpRight } from "lucide-react";

export default function AgentWidget() {
  return <Link href="/planner" aria-label="Open the preference-aware travel assistant" className="fixed bottom-6 right-5 z-50 flex items-center gap-3 rounded-full bg-[#176b5b] px-5 py-3.5 text-white shadow-lg transition-colors hover:bg-[#105344] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176b5b]" style={{ fontFamily: '"Gilroy Bold", Arial, sans-serif' }}><MessageCircle size={19} /><span className="text-sm">Plan with AI</span><ArrowUpRight size={15} /></Link>;
}
