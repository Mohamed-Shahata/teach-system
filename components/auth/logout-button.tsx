"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useTranslations } from "next-intl";
import { clientAuth } from "@/lib/client/firebaseClient";
import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton(props: Omit<ButtonProps, "onClick" | "loading">) {
  const t = useTranslations("auth.logout");
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    try {
      // Clear the server session (revokes refresh tokens) first, then the
      // client SDK's local state — if the network call fails we don't
      // want the UI to look signed-out while the session cookie is still
      // valid server-side.
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut(clientAuth);
      router.push("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button variant="destructive" {...props} loading={isPending} onClick={handleLogout}>
      {t("label")}
    </Button>
  );
}
