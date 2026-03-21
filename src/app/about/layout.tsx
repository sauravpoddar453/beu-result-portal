import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Us - BEU Result Portal",
  description: "Learn more about SP Creative and our mission at the BEU Result Portal, providing fast Bihar Engineering University updates for students.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
