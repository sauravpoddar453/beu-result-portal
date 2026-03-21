import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms and Conditions - BEU Result Portal",
  description: "Terms and conditions for using the BEU Result Portal. Learn about our service, disclaimers, and user expectations.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
