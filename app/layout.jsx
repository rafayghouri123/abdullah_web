import Script from 'next/script';

export const metadata = {
  title: 'United Carriers | Every leg of the journey',
  description:
    'Freight forwarding, land transport, and customs brokerage, unified across APAC under one accountable team.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'United Carriers | Global Freight Forwarding and Logistics',
    description:
      'Freight forwarding, land transport, and customs brokerage, unified across APAC under one accountable team.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'United Carriers | Global Freight Forwarding and Logistics',
    description:
      'Freight forwarding, land transport, and customs brokerage, unified across APAC under one accountable team.',
  },
  icons: {
    icon: '/assets/db7d10ef3e34eb28f7.png',
    apple: '/assets/2d399004bb68a24074.jpg',
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
        <Script id="united-carriers-animations" strategy="afterInteractive">
          {`if (!window.__unitedCarriersAnimationsLoaded) {
            window.__unitedCarriersAnimationsLoaded = true;
            for (const path of ['/frames.js', '/globe.js', '/freight-assets.js', '/freight.js', '/sea-air.js', '/recreation.js']) {
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
