import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hyunsurlinurl - Embedded Browser in Browser",
  description: "Seamless nested web browser experience with automatic link interception and no popup escapes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
