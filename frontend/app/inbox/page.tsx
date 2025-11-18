import InboxLayout from "./_components/InboxLayout";
import ProtectRoute from "@/components/routes/ProtectRoute";

export default function InboxPage() {
    return (
        <ProtectRoute>
            <InboxLayout />
        </ProtectRoute>
    );
}
