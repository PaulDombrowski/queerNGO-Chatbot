import type { Metadata } from "next";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "NGO Support Chat",
  description: "Barrierearmer Beratungs-Chat für eine NGO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
