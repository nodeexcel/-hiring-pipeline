import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hiring pipeline", template: "%s | Hiring pipeline" },
  description: "Interview process admin console",
  robots: { index: false, follow: false }, // private tool: keep it out of search results
};

// Runs before paint so the saved theme never flashes. Dark is the default.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('chaiui-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
