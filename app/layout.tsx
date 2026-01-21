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
                    <footer className="bg-gray-900 text-gray-400 py-6 mt-auto border-t border-gray-800">
                        <div className="container mx-auto px-4 text-center">
                            <p className="text-sm">
                                Made by{" "}
                                <a 
                                    href="https://sandipmaity.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    sandipmaity.me
                                </a>
                                {" "}© {new Date().getFullYear()}
                            </p>
                        </div>
                    </footer>
                </SessionProvider>
            </body>
        </html>
    );
}
