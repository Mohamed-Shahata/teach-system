"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Button, Card, Input, Select } from "@/components/ui";
import type { EducationStageDoc } from "@/lib/server/repositories/educationStageRepository";

/**
 * TASK-1000: Teacher creates a student account.
 *
 * `POST /api/teacher/students` (TASK-604) is create-only — there is no
 * teacher-scoped student *list* yet (that's TASK-1001/1002, Not Started),
 * so this renders a standalone create form rather than a table + dialog
 * like `CourseManager`. On success it surfaces the one-time password-reset
 * link from `CreatedAccount` (docs/decisions/0005) so the teacher can relay
 * it to the student — the link is never persisted or shown again.
 *
 * `phone`/`age` are required and `email` is optional (`createStudentSchema`)
 * — the center primarily reaches students by phone, and login already
 * resolves a phone identifier to the underlying account (`resolveLoginEmail`),
 * so a teacher can create a student with just a phone number. `stageId` is
 * a `Select` over the real `educationStages` lookup collection rather than
 * free text, matching the Admin-facing create form.
 */

interface StudentManagerProps {
  stages: EducationStageDoc[];
}

interface FormState {
  email: string;
  displayName: string;
  phone: string;
  age: string;
  stageId: string;
}

function emptyForm(stages: EducationStageDoc[]): FormState {
  return { email: "", displayName: "", phone: "", age: "", stageId: stages[0]?.id ?? "" };
}

interface CreatedStudent {
  email: string;
  displayName: string;
  resetLink: string;
}

export function StudentManager({ stages }: StudentManagerProps) {
  const t = useTranslations("teacherDashboard.students");
  const locale = useLocale();
  const [form, setForm] = React.useState<FormState>(() => emptyForm(stages));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedStudent | null>(null);
  const [copied, setCopied] = React.useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          phone: form.phone,
          age: form.age ? Number(form.age) : undefined,
          stageId: form.stageId,
          ...(form.email ? { email: form.email } : {}),
        }),
      });
      if (!res.ok) {
        setError(res.status === 409 ? t("errors.emailConflict") : t("errors.create"));
        return;
      }
      const account = (await res.json()) as CreatedStudent;
      setCreated(account);
      setForm(emptyForm(stages));
    } catch {
      setError(t("errors.create"));
    } finally {
      setPending(false);
    }
  }

  async function copyResetLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the
      // link is still selectable/visible in the panel below.
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Card className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("createTitle")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("formSubtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label={t("fields.displayName")}
              value={form.displayName}
              onChange={(event) => updateField("displayName", event.target.value)}
              required
            />
            <Input
              label={t("fields.phone")}
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              required
            />
            <Input
              label={t("fields.age")}
              type="number"
              min={2}
              max={25}
              value={form.age}
              onChange={(event) => updateField("age", event.target.value)}
              required
            />
            <Input
              label={t("fields.email")}
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <Select
              label={t("fields.stage")}
              placeholder={t("fields.selectPlaceholder")}
              options={stages.map((stage) => ({
                value: stage.id,
                label: stage.name[locale as "en" | "ar"] || stage.name.en,
              }))}
              value={form.stageId}
              onChange={(event) => updateField("stageId", event.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {t("create")}
            </Button>
          </div>
        </form>
      </Card>

      {created && (
        <Card className="flex flex-col gap-2 p-5">
          <h2 className="text-base font-semibold text-foreground">{t("success.title")}</h2>
          <p className="text-sm text-foreground/70">
            {t("success.description", { name: created.displayName, email: created.email })}
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground text-start">{t("success.resetLinkLabel")}</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground/80">
                {created.resetLink}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={copyResetLink}>
                {copied ? t("success.copied") : t("success.copy")}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
