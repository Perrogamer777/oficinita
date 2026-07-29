import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficinita",
  description: "Oficina virtual para tu equipo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
