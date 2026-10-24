import Script from 'next/script';

export const metadata = {
  title: 'MOBIN IMPEX | Customs Clearing & Freight Forwarding',
  description:
    'Licensed customs clearing and freight forwarding since 1996. MOBIN IMPEX provides reliable logistics solutions from Karachi, Pakistan.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'MOBIN IMPEX | Customs Clearing & Freight Forwarding',
    description:
      'Dependable customs clearance, freight forwarding and cargo support. Based in Karachi, with 24/7 customer support.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOBIN IMPEX | Customs Clearing & Freight Forwarding',
    description:
      'Dependable customs clearance, freight forwarding and cargo support. Based in Karachi, with 24/7 customer support.',
  },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/assets/reference.css" />
        <link rel="stylesheet" href="/recreation.css" />
        <link rel="stylesheet" href="/sea-air.css" />
        <link rel="stylesheet" href="/company.css" />
        <Script id="united-carriers-animations" strategy="afterInteractive">
          {`if (!window.__unitedCarriersAnimationsLoaded) {
            window.__unitedCarriersAnimationsLoaded = true;
            for (const path of ['/frames.js', '/globe.js', '/freight-assets.js', '/freight.js', '/sea-air.js', '/crane-scroll.js', '/recreation.js']) {
              const script = document.createElement('script');
              script.src = path;
              script.async = false;
              document.body.appendChild(script);
            }
          }`}
        </Script>
      </head>
      <body className="body">{children}</body>
    </html>
  );
}
