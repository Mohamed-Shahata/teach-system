"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useTranslations } from "next-intl";
import { clientAuth } from "@/lib/client/firebaseClient";
import { registerFormSchema, type RegisterFormInput } from "@/lib/validation/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

/**
 * Maps a Firebase Auth error code, or a `messageKey` from our own
 * `/api/auth/register` response, to a translated string. Anything
 * unrecognized falls back to a generic message — never the raw
 * Firebase/server error text.
 */
function resolveErrorKey(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && err.code === "auth/email-already-in-use") {
    return "auth.register.errors.emailInUse";
  }
  if (err && typeof err === "object" && "messageKey" in err && typeof err.messageKey === "string") {
    return err.messageKey;
  }
  return "errors.unexpected";
}

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { role: "student" },
  });

  const onSubmit = async (data: RegisterFormInput) => {
    setFormError(null);
    try {
      const credential = await createUserWithEmailAndPassword(clientAuth, data.email, data.password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: data.role, displayName: data.displayName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // Roll back the just-created Auth account so a failed profile
        // write doesn't strand an orphaned Auth-only user.
        await credential.user.delete().catch(() => {});
        throw body?.error ?? new Error("register_failed");
      }

      router.push("/dashboard");
    } catch (err) {
      setFormError(resolveErrorKey(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && (
        <Alert variant="error">{t(formError)}</Alert>
      )}

      <Input
        label={t("auth.register.fields.displayName")}
        autoComplete="name"
        error={errors.displayName && t(errors.displayName.message ?? "validation.required")}
        {...register("displayName")}
      />

      <Input
        type="email"
        label={t("auth.register.fields.email")}
        autoComplete="email"
        error={errors.email && t(errors.email.message ?? "validation.required")}
        {...register("email")}
      />

      <Input
        type="password"
        label={t("auth.register.fields.password")}
        autoComplete="new-password"
        error={errors.password && t(errors.password.message ?? "validation.required")}
        {...register("password")}
      />

      <Input
        type="password"
        label={t("auth.register.fields.confirmPassword")}
        autoComplete="new-password"
        error={errors.confirmPassword && t(errors.confirmPassword.message ?? "validation.required")}
        {...register("confirmPassword")}
      />

      <Select
        label={t("auth.register.fields.role")}
        options={[
          { value: "student", label: t("auth.register.roles.student") },
          { value: "teacher", label: t("auth.register.roles.teacher") },
        ]}
        error={errors.role && t(errors.role.message ?? "validation.required")}
        {...register("role")}
      />

      <Button type="submit" loading={isSubmitting} className="mt-2">
        {t("auth.register.submit")}
      </Button>
    </form>
  );
}
