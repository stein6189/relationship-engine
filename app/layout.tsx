import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { StoreProvider } from '@/lib/state/store';

export const metadata: Metadata = {
  title: 'Relationship Engine — prototype',
  description: 'Prototype built for the LIQID case study. Synthetic data, not investment advice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
