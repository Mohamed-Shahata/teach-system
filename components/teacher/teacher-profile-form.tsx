"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Card, Input, Textarea } from "@/components/ui";
import { uploadImage } from "@/lib/client/upload";
import type { MyTeacherProfile } from "@/lib/server/services/teacherProfileService";

interface TeacherProfileFormProps {
  initialProfile: MyTeacherProfile;
}

type SocialKey = "facebook" | "youtube" | "whatsapp" | "instagram" | "tiktok" | "website";
const SOCIAL_KEYS: SocialKey[] = ["facebook", "youtube", "whatsapp", "instagram", "tiktok", "website"];

interface FormState {
  bioEn: string;
  bioAr: string;
  headlineEn: string;
  headlineAr: string;
  yearsOfExperience: string;
  specialization: string;
  socialLinks: Record<SocialKey, string>;
}

function toFormState(profile: MyTeacherProfile): FormState {
  return {
    bioEn: profile.bio?.en ?? "",
    bioAr: profile.bio?.ar ?? "",
    headlineEn: profile.headline?.en ?? "",
    headlineAr: profile.headline?.ar ?? "",
    yearsOfExperience: typeof profile.yearsOfExperience === "number" ? String(profile.yearsOfExperience) : "",
    specialization: profile.specialization ?? "",
    socialLinks: SOCIAL_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: profile.socialLinks?.[key] ?? "" }),
      {} as Record<SocialKey, string>,
    ),
  };
}

/**
 * TASK-3102 — teacher self-service edit form for the TASK-3101 profile
 * fields. No field is required (unlike `TeacherSettingsForm`'s display
 * name) — a teacher can save any subset, and a completeness indicator
 * (server-computed, `MyTeacherProfile.completeness`) nudges toward filling
 * the rest without blocking anything.
 */
export function TeacherProfileForm({ initialProfile }: TeacherProfileFormProps) {
  const t = useTranslations("teacherDashboard.profile");

  const [profile, setProfile] = React.useState(initialProfile);
  const [form, setForm] = React.useState<FormState>(() => toFormState(initialProfile));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function updateSocial(key: SocialKey, value: string) {
    setForm((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: value } }));
    setSuccess(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const socialLinks = Object.fromEntries(
        SOCIAL_KEYS.map((key) => [key, form.socialLinks[key].trim()]).filter(([, value]) => value),
      );

      const body: Record<string, unknown> = {
        bio: { ...(form.bioEn ? { en: form.bioEn } : {}), ...(form.bioAr ? { ar: form.bioAr } : {}) },
        headline: {
          ...(form.headlineEn ? { en: form.headlineEn } : {}),
          ...(form.headlineAr ? { ar: form.headlineAr } : {}),
        },
        specialization: form.specialization.trim() || undefined,
        socialLinks,
      };
      if (form.yearsOfExperience.trim() !== "") {
        body.yearsOfExperience = Number(form.yearsOfExperience);
      }

      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update");
      const responseBody = (await res.json()) as { profile: MyTeacherProfile };
      setProfile(responseBody.profile);
      setForm(toFormState(responseBody.profile));
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
      const { secureUrl } = await uploadImage({ target: "avatar", file });
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: secureUrl }),
      });
      if (!res.ok) throw new Error("avatar");
      const body = (await res.json()) as { profile: MyTeacherProfile };
      setProfile(body.profile);
    } catch {
      setAvatarError(t("errors.updateAvatar"));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const initial = profile.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-foreground">{t("completeness.title")}</h2>
          <span className="text-sm font-semibold text-primary">{t("completeness.percent", { percent: profile.completeness })}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10" role="progressbar" aria-valuenow={profile.completeness} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profile.completeness}%` }} />
        </div>
        <p className="text-xs text-foreground/60">{t("completeness.hint")}</p>
      </Card>

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

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">{t("headline.title")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("headline.en")}
                value={form.headlineEn}
                maxLength={120}
                onChange={(event) => updateField("headlineEn", event.target.value)}
              />
              <Input
                label={t("headline.ar")}
                value={form.headlineAr}
                maxLength={120}
                dir="rtl"
                onChange={(event) => updateField("headlineAr", event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">{t("bio.title")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea
                label={t("bio.en")}
                value={form.bioEn}
                maxLength={2000}
                onChange={(event) => updateField("bioEn", event.target.value)}
              />
              <Textarea
                label={t("bio.ar")}
                value={form.bioAr}
                maxLength={2000}
                dir="rtl"
                onChange={(event) => updateField("bioAr", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("yearsOfExperience")}
              type="number"
              min={0}
              max={80}
              value={form.yearsOfExperience}
              onChange={(event) => updateField("yearsOfExperience", event.target.value)}
            />
            <Input
              label={t("specialization")}
              value={form.specialization}
              maxLength={120}
              onChange={(event) => updateField("specialization", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">{t("socialLinks.title")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_KEYS.map((key) => (
                <Input
                  key={key}
                  label={t(`socialLinks.${key}`)}
                  type="url"
                  value={form.socialLinks[key]}
                  placeholder="https://"
                  onChange={(event) => updateSocial(key, event.target.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <Button type="submit" loading={saving}>
              {t("save")}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
