import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beforest Media Library",
  description: "Dropbox media search and shortlisting for Beforest",
  icons: {
    icon: "/beforest-favicon.png",
    shortcut: "/beforest-favicon.png",
    apple: "/beforest-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
