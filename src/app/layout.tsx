import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduFinAI — Your AI-Powered Study Abroad Mentor",
  description:
    "Plan your postgraduate education abroad with AI. Get personalized university recommendations, admission predictions, ROI analysis, loan eligibility, SOP drafting, and visa interview prep — all in one platform.",
  keywords: [
    "study abroad",
    "education loan",
    "university admission",
    "GRE",
    "IELTS",
    "MS in US",
    "MBA abroad",
    "education financing",
    "SOP writing",
    "visa interview",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = JSON.parse(localStorage.getItem('edufinai-storage') || '{}');
                const theme = stored?.state?.theme || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              } catch(e) {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
