import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import "./globals.css";

const headingFont = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const bodyFont = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WhaleCall",
  description: "Uber-for-boats rideshare and emergency dispatch for a fictional island archipelago.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FCF9F4] text-[#1C1C19] font-[family-name:var(--font-body)]">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#0F2537",
              fontFamily: "var(--font-body)",
            },
          }}
        >
          <Nav />
          <main className="flex flex-1 flex-col pt-[96px]">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
