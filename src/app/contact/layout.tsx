import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact Us - BEU Result Portal",
  description: "Contact the developers of BEU Result Portal for any queries or support regarding Bihar Engineering University results.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
