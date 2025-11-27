import UserMenu from "@/components/ui/UserMenu";
function HeaderInbox() {
    return (
        <header className="relative z-20 border-b border-white/10 backdrop-blur-md bg-linear-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 py-3">
            <div className=" px-6 flex items-center justify-between">
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

                {/* Right: User Menu */}
                <UserMenu isHideEmail={false} />
            </div>
        </header>
    );
}

export default HeaderInbox;
