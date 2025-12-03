"use client";
import { useState, useCallback } from "react";
import FolderList from "./FolderList";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";
import { Email } from "../_types";
import HeaderInbox from "@/components/common/HeaderInbox";
import { ArrowLeft } from "lucide-react";
import ComposeModal from "./ComposeModal";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useModifyEmailMutation } from "../_services";

type ViewType = "folders" | "list" | "detail";

export default function InboxLayout() {
    const [view, setView] = useState<ViewType>("folders");
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    const modifyEmail = useMutationHandler(
        useModifyEmailMutation,
        "ModifyEmail"
    );

    const handleFolderSelect = (folderId: string) => {
        setSelectedFolder(folderId);
        setView("list");
    };

    // Callback to update selected email after modifications
    const handleEmailModified = useCallback((updatedEmail: Email) => {
        // Update selected email if it's the same one
        if (selectedEmail && selectedEmail.id === updatedEmail.id) {
            setSelectedEmail(updatedEmail);
        }
        // RTK Query cache is updated automatically via onQueryStarted
    }, [selectedEmail]);

    const handleEmailSelect = async (email: Email) => {

        // Save original read status before optimistic update
        const wasUnread = !email.isRead;

        // Update selected email with optimistic read status
        const updatedEmail = { ...email, isRead: true };
        setSelectedEmail(updatedEmail);
        setView("detail");

        // Call API to mark as read if not already read
        if (wasUnread) {
            try {

                // Notify EmailList to update
                handleEmailModified(updatedEmail);
            } catch (error) {
                console.error("Failed to mark as read:", error);
                // Revert optimistic update on error
                setSelectedEmail(email);
            }
        }
    };

    const handleBackFromList = () => {
        setSelectedFolder("");
        setView("folders");
    };

    const handleBackFromDetail = () => {
        setSelectedEmail(null);
        setView("list");
    };
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden text-white">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f] backdrop-blur-sm" />
            <ComposeModal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
            />
            <HeaderInbox />

            {/* Desktop Layout (≥768px) - 3 columns always visible */}
            <div className="hidden md:flex relative z-10 flex-1 w-full overflow-hidden">
                {/* Folders */}
                <div className="w-1/5 h-full border-r border-white/10 backdrop-blur-md flex flex-col">
                    <FolderList
                        selected={selectedFolder}
                        onSelect={handleFolderSelect}
                    />
                </div>

                {/* Email List */}
                <div className="w-2/5 h-full border-r border-white/10 backdrop-blur-md">
                    <EmailList
                        selectedFolder={selectedFolder}
                        selectedEmail={selectedEmail}
                        onSelectEmail={handleEmailSelect}
                        onEmailModified={handleEmailModified}
                        isComposeOpen={isComposeOpen}
                        setIsComposeOpen={setIsComposeOpen}
                    />
                </div>

                {/* Email Detail */}
                <div className="flex-1 h-full backdrop-blur-md overflow-x-auto custom-scroll">
                    <EmailDetail
                        email={selectedEmail}
                        onEmailModified={handleEmailModified}
                    />
                </div>
            </div>

            {/* Mobile Layout (<768px) - One view at a time */}
            <div className="md:hidden relative z-10 flex-1 w-full flex flex-col overflow-hidden">
                {view === "folders" && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <FolderList
                            selected={selectedFolder}
                            onSelect={handleFolderSelect}
                        />
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
                                onEmailModified={handleEmailModified}
                                isComposeOpen={isComposeOpen}
                                setIsComposeOpen={setIsComposeOpen}
                            />
                        </div>
                    </div>
                )}

                {view === "detail" && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <EmailDetail
                            email={selectedEmail}
                            onBack={handleBackFromDetail}
                            onEmailModified={handleEmailModified}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
