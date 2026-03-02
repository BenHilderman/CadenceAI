"use client";

import { usePathname } from "next/navigation";
import { BookingPage } from "@/components/booking/BookingPage";

export default function BookPage() {
  const pathname = usePathname();
  // URL: /book/some-slug → extract last segment
  const slug = pathname.split("/").filter(Boolean).pop() || "";
  return <BookingPage slug={slug} />;
}
