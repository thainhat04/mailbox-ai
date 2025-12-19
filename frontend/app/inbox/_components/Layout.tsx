"use client";
import { useState } from "react";
import HeaderInbox from "@/components/common/HeaderInboxEnhanced";
import CommondLayout from "./CommonMode/CommonLayout";
import KanbanLayout from "./KanbanMode/KanbanLayout";
import SearchModal from "./SearchModal";

function InboxLayout() {
    const [isCommondMode, setIsCommandMode] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (query: string) => {
        if (query.trim()) {
            setSearchQuery(query);
            setIsSearchOpen(true);
        }
    };

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
    };

    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden text-white">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f] backdrop-blur-sm" />
            <HeaderInbox
                isCommondMode={isCommondMode}
                setIsCommandMode={setIsCommandMode}
                onSearch={handleSearch}
            />

            <CommondLayout isCommondMode={isCommondMode} />

            <div style={{ display: isCommondMode ? "none" : "block" }}>
                <KanbanLayout />
            </div>

            {/* Search Modal */}
            <SearchModal
                isOpen={isSearchOpen}
                onClose={handleCloseSearch}
                searchQuery={searchQuery}
            />
        </div>
    );
}

export default InboxLayout;
