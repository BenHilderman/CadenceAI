import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/BookingPage";

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Book a meeting with ${slug}`,
    description: `Schedule a meeting with ${slug} via CadenceAI. Pick a time, confirm, and get a Google Meet link instantly.`,
    openGraph: {
      title: `Book a meeting with ${slug} - CadenceAI`,
      description: `Schedule a meeting with ${slug}. Pick a time, confirm, and get a Google Meet link instantly.`,
      type: "website",
    },
  };
}

export default async function BookPage({ params }: BookingPageProps) {
  const { slug } = await params;
  return <BookingPage slug={slug} />;
}
