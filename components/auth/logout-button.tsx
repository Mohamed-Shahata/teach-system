"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import { clientAuth } from "@/lib/client/firebaseClient";
import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton(props: Omit<ButtonProps, "onClick" | "loading">) {
  const t = useTranslations("auth.logout");
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  const handleLogout = async () => {
    setIsPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut(clientAuth);

      router.push("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      {...props}
      variant="ghost"
      size="sm"
      loading={isPending}
      onClick={handleLogout}
      startIcon={<LogOut className="h-4 w-4" />}
      className="
  h-10
  rounded-xl
  border border-border/60
  bg-background/40
  px-3.5
  text-error
  shadow-sm
  backdrop-blur-sm
  transition-all duration-200

  hover:border-error/30
  hover:bg-error/10
  hover:shadow-md
  hover:shadow-error/5

  active:scale-[0.97]
"
    >
      {t("label")}
    </Button>
  );
}
