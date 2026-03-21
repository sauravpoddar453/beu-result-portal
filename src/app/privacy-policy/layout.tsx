import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy - BEU Result Portal",
  description: "Privacy Policy for BEU Result Portal. Learn how we handle your data and cookies at SP Creative.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
