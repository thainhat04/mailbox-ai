"use client";

interface ToolbarAction {
    label: string;
    onClick: () => void;
    style?: string; // Tailwind classes nếu cần override
}

interface EmailToolbarProps {
    selectedFolder: string;
    actions: ToolbarAction[];
}

export default function EmailToolbar({
    selectedFolder,
    actions,
}: EmailToolbarProps) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    className={
                        action.style ??
                        "rounded-full cursor-pointer border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                    }
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            ))}
            <div className="ml-auto text-[10px] uppercase tracking-wide text-white/40">
                {selectedFolder}
            </div>
        </div>
    );
}
