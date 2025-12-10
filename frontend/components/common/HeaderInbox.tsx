"use client";

import { useState } from "react";
import UserMenu from "@/components/ui/UserMenu";
interface HeaderInboxProps {
    isCommondMode: boolean;
    setIsCommandMode: (mode: boolean) => void;
}
function HeaderInbox({ isCommondMode, setIsCommandMode }: HeaderInboxProps) {
    return (
        <header className="relative z-20 border-b border-white/10 backdrop-blur-md bg-linear-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 py-3">
            <div className="px-6 flex items-center justify-between">
                {/* Left: Logo + Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/30">
                        ✉️
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <h1 className="font-bold text-lg leading-tight">
                            MailBox
                        </h1>
                        <p className="text-[11px] text-white/50 -mt-0.5">
                            Professional Email
                        </p>
                    </div>
                </div>

                {/* Center: View Mode Toggle */}
                <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setIsCommandMode(true)}
                        className={`px-4 cursor-pointer py-1.5 rounded-md text-sm font-medium transition-all ${
                            isCommondMode
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "hover:bg-blue-500/20 text-white/70 hover:text-blue-400"
                        }`}
                    >
                        Common
                    </button>
                    <button
                        onClick={() => setIsCommandMode(false)}
                        className={`px-4 py-1.5 cursor-pointer rounded-md text-sm font-medium transition-all ${
                            !isCommondMode
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "hover:bg-blue-500/20 text-white/70 hover:text-blue-400"
                        }`}
                    >
                        Kanban
                    </button>
                </div>

                {/* Right: User Menu */}
                <UserMenu isHideEmail={false} />
            </div>
        </header>
    );
}

export default HeaderInbox;
