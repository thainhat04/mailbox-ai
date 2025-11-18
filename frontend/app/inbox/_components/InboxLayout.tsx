"use client";

import { useState } from "react";
import FolderList from "./FolderList";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";
import { Email } from "../_types";
import UserMenu from "@/components/ui/UserMenu";

export default function InboxLayout() {
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    return (
        <div className="relative h-screen w-full flex overflow-hidden text-white">
            {/* Gradient background dịu mắt */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f] backdrop-blur-sm" />

            {/* Layout Columns */}
            <div className="relative z-10 flex h-full w-full">
                {/* Folder list */}
                <div className="w-[20%] h-full border-r border-white/10  backdrop-blur-md flex flex-col">
                    <FolderList
                        selected={selectedFolder}
                        onSelect={setSelectedFolder}
                    />
                    <div className="bg-white/5 p-4 border-t border-white/10 flex justify-center">
                        <UserMenu isTop={true} isHideEmail={true} />
                    </div>
                </div>

                {/* Email list */}
                <div className="w-[40%] h-full border-r border-white/10  backdrop-blur-md">
                    <EmailList
                        selectedFolder={selectedFolder}
                        selectedEmail={selectedEmail}
                        onSelectEmail={setSelectedEmail}
                    />
                </div>

                {/* Email detail */}
                <div className="custom-scroll flex-1 h-full  backdrop-blur-md overflow-x-auto">
                    <EmailDetail email={selectedEmail} />
                </div>
            </div>
        </div>
    );
}
