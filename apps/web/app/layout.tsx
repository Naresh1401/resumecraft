import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Resume Tailoring — AI-powered, ATS-optimized",
  description: "Tailor your resume to any job description with AI. Score it for ATS. Land interviews.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
