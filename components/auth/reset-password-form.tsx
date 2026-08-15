"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { clientAuth } from "@/lib/client/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/states";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.register.errors.passwordMismatch",
    path: ["confirmPassword"],
  });
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

type CodeState = "checking" | "valid" | "invalid" | "done";

export function ResetPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [codeState, setCodeState] = React.useState<CodeState>("checking");
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  React.useEffect(() => {
    if (!oobCode) {
      setCodeState("invalid");
      return;
    }
    verifyPasswordResetCode(clientAuth, oobCode)
      .then(() => setCodeState("valid"))
      .catch(() => setCodeState("invalid"));
  }, [oobCode]);

  const onSubmit = async ({ password }: ResetPasswordInput) => {
    if (!oobCode) return;
    setFormError(null);
    try {
      await confirmPasswordReset(clientAuth, oobCode, password);
      setCodeState("done");
    } catch {
      setFormError("errors.unexpected");
    }
  };

  if (codeState === "checking") {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (codeState === "invalid") {
    return <Alert variant="error">{t("auth.resetPassword.invalidLink")}</Alert>;
  }

  if (codeState === "done") {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">{t("auth.resetPassword.successMessage")}</Alert>
        <Button onClick={() => router.push("/login")}>{t("auth.login.submit")}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && <Alert variant="error">{t(formError)}</Alert>}

      <Input
        type="password"
        label={t("auth.resetPassword.fields.password")}
        autoComplete="new-password"
        error={errors.password && t("validation.required")}
        {...register("password")}
      />

      <Input
        type="password"
        label={t("auth.resetPassword.fields.confirmPassword")}
        autoComplete="new-password"
        error={errors.confirmPassword && t(errors.confirmPassword.message ?? "validation.required")}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={isSubmitting} className="mt-2">
        {t("auth.resetPassword.submit")}
      </Button>
    </form>
  );
}
