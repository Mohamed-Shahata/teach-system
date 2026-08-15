"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { useTranslations, useLocale } from "next-intl";
import { z } from "zod";
import { clientAuth } from "@/lib/client/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const locale = useLocale();
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async ({ email }: ForgotPasswordInput) => {
    try {
      await sendPasswordResetEmail(clientAuth, email);
    } catch {
      // Intentionally ignored: we still show the generic "sent" state
      // below regardless of whether the address is registered, so this
      // flow can't be used to enumerate which emails have accounts.
    } finally {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">{t("sentMessage")}</Alert>
        <Link
          href={`/${locale}/login`}
          className="self-center text-sm font-medium text-primary hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          type="email"
          label={t("fields.email")}
          autoComplete="email"
          error={errors.email && t("errors.invalidEmail")}
          {...register("email")}
        />

        <Button type="submit" loading={isSubmitting} className="mt-2">
          {t("submit")}
        </Button>
      </form>

      <Link
        href={`/${locale}/login`}
        className="self-center text-sm font-medium text-primary hover:underline"
      >
        {t("backToLogin")}
      </Link>
    </div>
  );
}
