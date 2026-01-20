import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-grotesk",
    weight: ["400", "700"],
});

const spaceMono = Space_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    weight: ["400", "700"],
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "AuctionMaker - Real-Time Bidding Platform",
    description: "A fully customizable, real-time multi-user auction bidding platform",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession(authOptions);

    return (
        <html lang="en">
            <body
                className={`${spaceGrotesk.variable} ${spaceMono.variable} ${inter.variable} antialiased`}
            >
                <SessionProvider session={session}>
                    <Header />
                    <main className="min-h-screen">
                        {children}
                    </main>
                </SessionProvider>
            </body>
        </html>
    );
}
