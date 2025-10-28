"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return null;
}
