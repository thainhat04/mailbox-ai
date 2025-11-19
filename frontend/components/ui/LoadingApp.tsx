"use client";

export default function LoadingApp() {
    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden text-white">
            {/* Background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f]" />
            <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[110px]" />
            <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.07),transparent)]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <img
                    src="/vercel.svg"
                    alt="Logo"
                    className="w-20 h-20 opacity-90"
                />

                <div className="text-lg font-semibold text-white/80">
                    Mailbox AI
                </div>

                {/* Spinner */}
                <div className="mt-2">
                    <svg
                        className="animate-spin"
                        width="48"
                        height="48"
                        viewBox="0 0 50 50"
                    >
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            className="stroke-white/10"
                            strokeWidth="5"
                            fill="none"
                        />
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                            className="stroke-cyan-400"
                            strokeDasharray="31.4 31.4"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}
