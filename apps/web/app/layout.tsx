import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CommandPalette } from '@/components/CommandPalette';
import { AuthProvider } from '@/lib/auth-context';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "BugzillaRevamp — Modern Defect Tracking Platform",
  description: "High-performance bug tracking, dependency management, and CVSS v4.0 vulnerability governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CommandPalette />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
