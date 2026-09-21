import type { Metadata } from "next";
import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "찬양 콘티 기록",
  description: "매주 콘티를 올리고, 곡을 모아보는 곳",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSerifKr.variable} ${notoSansKr.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
