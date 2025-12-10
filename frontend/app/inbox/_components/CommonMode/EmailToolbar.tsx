"use client";

interface ToolbarAction {
    label: string;
    onClick: () => void;
    style?: string;
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
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-wrap bg-linear-to-r from-slate-900/30 to-slate-900/20 backdrop-blur-sm">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    className={
                        action.style ??
                        "rounded-lg cursor-pointer border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:border-white/30 transition"
                    }
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            ))}
            <div className="ml-auto text-xs font-medium text-cyan-400/70 truncate">
                {selectedFolder}
            </div>
        </div>
    );
}
