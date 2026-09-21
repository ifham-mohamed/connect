"use client";

import { useRouter } from "next/navigation";
import { AuthGate } from "./auth-gate";

export function AuthPage({
  initialMode,
}: {
  initialMode: "sign-in" | "sign-up";
}) {
  const router = useRouter();

  return (
    <AuthGate
      initialMode={initialMode}
      onAuthenticated={async () => {
        const requested = new URLSearchParams(window.location.search).get("next");
        const destination = requested?.startsWith("/app/")
          ? requested
          : "/app/dashboard";
        router.replace(destination);
      }}
    />
  );
}
