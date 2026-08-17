"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Button, Card, Input } from "@/components/ui";
import { uploadImage } from "@/lib/client/upload";
import type { MyStudentProfile } from "@/lib/server/services/studentProfileService";

interface StudentProfileFormProps {
  initialProfile: MyStudentProfile;
}

/**
 * TASK-3201 — student self-service "my profile" form: avatar,
 * `displayName`, `birthDate` (derived `age` shown alongside it, never
 * directly editable), and a read-only grade level (`stageId`/`stageName`).
 * Avatar upload reuses TASK-1005's existing `target: "avatar"` signed
 * upload + `PATCH /api/student/settings/avatar` (same Cloudinary field as
 * `StudentSettingsForm`'s account picture) rather than a second endpoint;
 * `displayName`/`birthDate` go through the new `PATCH /api/student/profile`.
 */
export function StudentProfileForm({ initialProfile }: StudentProfileFormProps) {
  const t = useTranslations("studentDashboard.myProfile");
  const locale = useLocale() as "en" | "ar";

  const [profile, setProfile] = React.useState(initialProfile);
  const [displayName, setDisplayName] = React.useState(initialProfile.displayName);
  const [birthDate, setBirthDate] = React.useState(initialProfile.birthDate ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const dirty = displayName.trim() !== profile.displayName || birthDate !== (profile.birthDate ?? "");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (displayName.trim() !== profile.displayName) body.displayName = displayName.trim();
      if (birthDate !== (profile.birthDate ?? "")) body.birthDate = birthDate;

      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update");
      const responseBody = (await res.json()) as { profile: MyStudentProfile };
      setProfile(responseBody.profile);
      setDisplayName(responseBody.profile.displayName);
      setBirthDate(responseBody.profile.birthDate ?? "");
      setSuccess(true);
    } catch {
      setError(t("errors.update"));
    } finally {
      setSaving(false);
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
      setProfile((prev) => ({ ...prev, avatarUrl: secureUrl }));
    } catch {
      setAvatarError(t("errors.updateAvatar"));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const initial = profile.displayName.trim().charAt(0).toUpperCase() || "?";
  const today = new Date().toISOString().slice(0, 10);
  const stageLabel = profile.stageName?.[locale] ?? profile.stageName?.en;

  return (
    <section className="flex max-w-2xl flex-col gap-4">
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
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{t("success")}</Alert>}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label={t("displayName")}
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setSuccess(false);
            }}
            required
            minLength={2}
            maxLength={80}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("birthDate")}
              type="date"
              value={birthDate}
              max={today}
              onChange={(event) => {
                setBirthDate(event.target.value);
                setSuccess(false);
              }}
            />
            <Input
              label={t("age")}
              value={profile.age !== undefined ? String(profile.age) : t("ageUnset")}
              disabled
              readOnly
            />
          </div>

          <Input label={t("stage")} value={stageLabel ?? t("stageNone")} disabled readOnly />

          <div>
            <Button type="submit" loading={saving} disabled={!dirty}>
              {t("save")}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
