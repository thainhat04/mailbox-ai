"use client";

import { useState } from "react";
import FolderList from "./FolderList";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";
import { Email } from "../_types";
import UserMenu from "@/components/ui/UserMenu";
import { ArrowLeft } from "lucide-react";

type ViewType = "folders" | "list" | "detail";

export default function InboxLayout() {
    const [view, setView] = useState<ViewType>("folders");
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    const handleFolderSelect = (folderId: string) => {
        setSelectedFolder(folderId);
        setView("list");
    };

    const handleEmailSelect = (email: Email) => {
        setSelectedEmail(email);
        setView("detail");
    };

    const handleBackFromList = () => {
        setSelectedFolder("");
        setView("folders");
    };

    const handleBackFromDetail = () => {
        setSelectedEmail(null);
        setView("list");
    };

    return (
        <div className="relative h-screen w-full flex overflow-hidden text-white">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f] backdrop-blur-sm" />

            {/* Desktop Layout (≥768px) - 3 columns always visible */}
            <div className="hidden md:flex relative z-10 h-full w-full">
                {/* Folders */}
                <div className="w-1/5 z-10000 h-full border-r border-white/10 backdrop-blur-md flex flex-col">
                    <FolderList
                        selected={selectedFolder}
                        onSelect={handleFolderSelect}
                    />
                    <div className="bg-white/5 p-4 border-t border-white/10 flex justify-center">
                        <UserMenu isTop={true} isHideEmail={true} />
                    </div>
                </div>

                {/* Email List */}
                <div className="w-2/5 h-full border-r border-white/10 backdrop-blur-md">
                    <EmailList
                        selectedFolder={selectedFolder}
                        selectedEmail={selectedEmail}
                        onSelectEmail={handleEmailSelect}
                    />
                </div>

                {/* Email Detail */}
                <div className="flex-1 h-full backdrop-blur-md overflow-x-auto custom-scroll">
                    <EmailDetail email={selectedEmail} />
                </div>
            </div>

            {/* Mobile Layout (<768px) - One view at a time */}
            <div className="md:hidden relative z-10 h-full w-full flex flex-col">
                {view === "folders" && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <FolderList
                            selected={selectedFolder}
                            onSelect={handleFolderSelect}
                        />
                        <div className="bg-white/5 p-4 border-t border-white/10 flex justify-center">
                            <UserMenu isTop={true} isHideEmail={true} />
                        </div>
                    </div>
                )}

                {view === "list" && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Back button header */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <button
                                onClick={handleBackFromList}
                                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
                                aria-label="Back to folders"
                            >
                                <ArrowLeft size={18} />
                                <span>Back</span>
                            </button>
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-white/40">
                                {selectedFolder}
                            </span>
                        </div>
                        {/* Email List */}
                        <div className="flex-1 overflow-hidden">
                            <EmailList
                                selectedFolder={selectedFolder}
                                selectedEmail={selectedEmail}
                                onSelectEmail={handleEmailSelect}
                            />
                        </div>
                    </div>
                )}

                {view === "detail" && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <EmailDetail
                            email={selectedEmail}
                            onBack={handleBackFromDetail}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
