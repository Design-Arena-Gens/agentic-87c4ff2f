import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ODIGO-RCS",
  description:
    "Sistema de Certificaci?n y Preservaci?n Digital con Ticker en Tiempo Real",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="container">
          {children}
          <footer style={{ opacity: 0.75, marginTop: 32 }} className="row">
            <span className="muted">
              ? {new Date().getFullYear()} ODIGO-RCS ? Ingenier?a de confianza
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}

