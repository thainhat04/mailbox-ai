"use client";
import Link from "next/link";
import { useSelector } from "@/store";
import { RootState } from "@/store";
import UserMenu from "@/components/ui/UserMenu";
import { useTranslation } from "react-i18next";

export default function Home() {
    const { isLoggedIn, user } = useSelector((s: RootState) => s.auth);
    const { t } = useTranslation();
    return (
        <div className="relative min-h-screen w-full text-white font-sans overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0f111a] via-[#1a1b2b] to-[#2c1e4f]" />
            <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[110px]" />
            <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.07),transparent)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4">
                <h1 className="text-sm font-semibold tracking-wider text-white/70">
                    Mailbox AI
                </h1>
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <UserMenu isHome={true} />
                    ) : (
                        <Link
                            href="/auth/login"
                            className="rounded-lg px-3 py-2 text-xs font-medium bg-white/10 hover:bg-white/15 ring-1 ring-white/15 transition"
                        >
                            {t("home.5")}
                        </Link>
                    )}
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-120px)] max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 ring-1 ring-white/10 px-4 py-1 text-[11px] text-white/70 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]" />
                    {isLoggedIn ? t("home.1") : t("home.2")}
                </div>

                <h2 className="mt-6 bg-linear-to-r from-cyan-300 via-sky-300 to-fuchsia-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                    {t("home.3")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
                    {t("home.4")}
                </p>

                {/* CTAs */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    {!isLoggedIn && (
                        <>
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center rounded-full bg-linear-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition"
                            >
                                {t("home.5")}
                            </Link>
                            <Link
                                href="/auth/sign-up"
                                className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white/80 ring-1 ring-white/15 hover:bg-white/10 hover:text-white transition"
                            >
                                {t("home.6")}
                            </Link>
                        </>
                    )}
                    {isLoggedIn && (
                        <Link
                            href="/inbox"
                            className="inline-flex items-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/20 transition"
                        >
                            {t("home.13")}
                        </Link>
                    )}
                </div>

                {/* Features */}
                <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
                    <FeatureCard title={t("home.7")} desc={t("home.8")} />
                    <FeatureCard title={t("home.9")} desc={t("home.10")} />
                    <FeatureCard title={t("home.11")} desc={t("home.12")} />
                </div>

                {/* Footer */}
                <footer className="mt-16 text-[11px] text-white/40">
                    © {new Date().getFullYear()} Mailbox AI
                    {user?.name && (
                        <span className="ml-2 text-white/50">
                            • {user.name}
                        </span>
                    )}
                </footer>
            </main>
        </div>
    );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="rounded-xl bg-white/4 ring-1 ring-white/10 px-5 py-5 text-left backdrop-blur-sm transition hover:bg-white/6">
            <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
            <p className="text-[12px] leading-relaxed text-white/55">{desc}</p>
        </div>
    );
}
