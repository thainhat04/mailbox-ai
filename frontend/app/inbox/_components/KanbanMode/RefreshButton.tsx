import { RefreshCw } from "lucide-react";

export default function RefreshButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="
                 rounded-lg 
                flex items-center gap-2 
               cursor-pointer
                text-white font-medium 
                transition-colors
            "
        >
            <RefreshCw className="h-4 w-4 animate-spin-slow" />
            Refresh
        </button>
    );
}
