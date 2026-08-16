"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Card, Input } from "@/components/ui";
import { uploadImage } from "@/lib/client/upload";
import type { StudentProfile } from "@/lib/server/services/studentSettingsService";

interface StudentSettingsFormProps {
  initialProfile: StudentProfile;
}

/**
 * TASK-1005 — Student's own account settings: display name, password
 * (one-time reset link, ADR 0005), and profile picture. Mirrors
 * `AdminSettingsForm` (TASK-1907) for the name/password sections and
 * adds the avatar card, built on the existing signed-upload flow
 * (`uploadService`'s `target: "avatar"`, `lib/client/upload.ts`).
 */
export function StudentSettingsForm({ initialProfile }: StudentSettingsFormProps) {
  const t = useTranslations("studentDashboard.settings");

  const [profile, setProfile] = React.useState(initialProfile);
  const [displayName, setDisplayName] = React.useState(initialProfile.displayName);
  const [savingName, setSavingName] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = React.useState(false);

  const [resetLink, setResetLink] = React.useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function onSubmitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setNameSuccess(false);
    setSavingName(true);
    try {
      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error("update");
      const body = (await res.json()) as { profile: StudentProfile };
      setProfile(body.profile);
      setNameSuccess(true);
    } catch {
      setNameError(t("errors.updateName"));
    } finally {
      setSavingName(false);
    }
  }

  async function onGenerateResetLink() {
    setLinkError(null);
    setResetLink(null);
    setGeneratingLink(true);
    try {
      const res = await fetch("/api/student/settings/password-reset-link", { method: "POST" });
      if (!res.ok) throw new Error("reset-link");
      const body = (await res.json()) as { resetLink: string };
      setResetLink(body.resetLink);
    } catch {
      setLinkError(t("errors.resetLink"));
    } finally {
      setGeneratingLink(false);
    }
  }

  async function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const { secureUrl, publicId } = await uploadImage({ target: "avatar", file });
      const res = await fetch("/api/student/settings/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: secureUrl, avatarPublicId: publicId }),
      });
      if (!res.ok) throw new Error("avatar");
      const body = (await res.json()) as { profile: StudentProfile };
      setProfile(body.profile);
    } catch {
      setAvatarError(t("errors.updateAvatar"));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const initial = profile.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold text-foreground">{t("avatar.title")}</h2>

        {avatarError && <Alert variant="error">{avatarError}</Alert>}

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary delivery URL, not a Next-optimizable local asset.
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("avatar.change")}
            </Button>
            <p className="text-xs text-foreground/50">{t("avatar.hint")}</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarSelected}
            aria-label={t("avatar.change")}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold text-foreground">{t("profile.title")}</h2>

        {nameError && <Alert variant="error">{nameError}</Alert>}
        {nameSuccess && <Alert variant="success">{t("profile.success")}</Alert>}

        <form onSubmit={onSubmitName} className="flex flex-col gap-4">
          <Input label={t("profile.email")} value={profile.email} disabled readOnly />
          <Input
            label={t("profile.displayName")}
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setNameSuccess(false);
            }}
            required
            minLength={2}
            maxLength={80}
          />
          <div>
            <Button type="submit" loading={savingName} disabled={displayName.trim() === profile.displayName}>
              {t("profile.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold text-foreground">{t("password.title")}</h2>
        <p className="text-sm leading-6 text-foreground/60">{t("password.description")}</p>

        {linkError && <Alert variant="error">{linkError}</Alert>}

        {resetLink ? (
          <Alert variant="success">
            <p className="mb-2">{t("password.linkReady")}</p>
            <a href={resetLink} className="break-all text-sm font-medium text-primary underline underline-offset-2">
              {resetLink}
            </a>
          </Alert>
        ) : (
          <div>
            <Button type="button" variant="outline" loading={generatingLink} onClick={onGenerateResetLink}>
              {t("password.generate")}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
