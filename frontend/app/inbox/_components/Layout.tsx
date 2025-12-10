"use client";
import { useState } from "react";
import HeaderInbox from "@/components/common/HeaderInbox";
import CommondLayout from "./CommonMode/CommonLayout";
import KanbanLayout from "./KanbanMode/KanbanLayout";

function InboxLayout() {
    const [isCommondMode, setIsCommandMode] = useState(false);
    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden text-white">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f] backdrop-blur-sm" />
            <HeaderInbox
                isCommondMode={isCommondMode}
                setIsCommandMode={setIsCommandMode}
            />
            <div style={{ display: isCommondMode ? "block" : "none" }}>
                <CommondLayout />
            </div>
            <div style={{ display: isCommondMode ? "none" : "block" }}>
                <KanbanLayout />
            </div>
        </div>
    );
}

export default InboxLayout;
