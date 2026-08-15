"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { z } from "zod";
import { clientAuth } from "@/lib/client/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const loginFormSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1),
});
type LoginFormInput = z.infer<typeof loginFormSchema>;

function resolveErrorKey(err: unknown): string {
  const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "auth.login.errors.invalidCredentials";
  }
  return "errors.unexpected";
}

export function LoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = async (data: LoginFormInput) => {
    setFormError(null);
    try {
      const credential = await signInWithEmailAndPassword(clientAuth, data.email, data.password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw body?.error ?? new Error("session_failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setFormError(resolveErrorKey(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && <Alert variant="error">{t(formError)}</Alert>}

      <Input
        type="email"
        label={t("auth.login.fields.email")}
        autoComplete="email"
        error={errors.email && t("validation.required")}
        {...register("email")}
      />

      <Input
        type="password"
        label={t("auth.login.fields.password")}
        autoComplete="current-password"
        error={errors.password && t("validation.required")}
        {...register("password")}
      />

      <Link
        href={`/${locale}/forgot-password`}
        className="self-start text-sm text-primary hover:underline"
      >
        {t("auth.login.forgotPassword")}
      </Link>

      <Button type="submit" loading={isSubmitting} className="mt-2">
        {t("auth.login.submit")}
      </Button>
    </form>
  );
}
