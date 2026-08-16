"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { z } from "zod";
import { clientAuth } from "@/lib/client/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1),
});
type LoginFormInput = z.infer<typeof loginFormSchema>;

/** Looks up the email for a login identifier that may be a phone number. */
async function resolveLoginEmail(identifier: string): Promise<string> {
  const res = await fetch("/api/auth/resolve-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw body?.error ?? new Error("resolve_login_failed");
  }

  const body = await res.json();
  return body.email as string;
}

function resolveErrorKey(err: unknown): string {
  const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "auth.login.errors.invalidCredentials";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "";
  }
  return "errors.unexpected";
}

async function createSession(idToken: string): Promise<{ role: "admin" | "teacher" | "student" | null }> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw body?.error ?? new Error("session_failed");
  }

  const body = await res.json();
  return { role: body.role ?? null };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = async (data: LoginFormInput) => {
    setFormError(null);
    try {
      const email = await resolveLoginEmail(data.identifier);
      const credential = await signInWithEmailAndPassword(clientAuth, email, data.password);
      const idToken = await credential.user.getIdToken();
      const { role } = await createSession(idToken);

      router.push(`/${locale}/${role ?? ""}`);
      router.refresh();
    } catch (err) {
      const messageKey = err && typeof err === "object" && "messageKey" in err ? (err as { messageKey?: string }).messageKey : undefined;
      setFormError(messageKey || resolveErrorKey(err));
    }
  };

  const onGoogleSignIn = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(clientAuth, provider);
      const idToken = await credential.user.getIdToken();
      const { role } = await createSession(idToken);

      router.push(`/${locale}/${role ?? ""}`);
      router.refresh();
    } catch (err) {
      const key = resolveErrorKey(err);
      if (key) setFormError(key);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {formError && <Alert variant="error">{t(formError)}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          type="text"
          label={t("auth.login.fields.identifier")}
          autoComplete="username"
          inputMode="email"
          error={errors.identifier && t("validation.required")}
          {...register("identifier")}
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

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-foreground/50">{t("auth.login.divider")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        loading={googleLoading}
        onClick={onGoogleSignIn}
        startIcon={!googleLoading ? <GoogleIcon /> : undefined}
      >
        {t("auth.login.continueWithGoogle")}
      </Button>
    </div>
  );
}
