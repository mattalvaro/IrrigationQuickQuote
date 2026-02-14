import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "IrrigationQuickQuote",
  description: "Get a guide price for your DIY irrigation project in minutes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/css/mapbox-gl.css" rel="stylesheet" />
        <link href="/css/mapbox-gl-draw.css" rel="stylesheet" />
      </head>
      <body className="bg-botanical noise-overlay antialiased">
        <Script
          src="https://api.mapbox.com/mapbox-gl-js/v3.18.1/mapbox-gl.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.1/mapbox-gl-draw.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
