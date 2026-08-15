"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, Button, Card, CardContent, Input, Select } from "@/components/ui";
import type { ScheduleSlotDoc } from "@/lib/server/repositories/scheduleRepository";

interface ScheduleManagerProps {
  initialSlots: ScheduleSlotDoc[];
}

interface FormState {
  id?: string;
  subjectId: string;
  stageId: string;
  courseId: string;
  dayOfWeek: string;
  startTime: string;
  durationMinutes: string;
  labelEn: string;
  labelAr: string;
}

const EMPTY_FORM: FormState = {
  subjectId: "",
  stageId: "",
  courseId: "",
  dayOfWeek: "0",
  startTime: "17:00",
  durationMinutes: "90",
  labelEn: "",
  labelAr: "",
};

function toFormState(slot: ScheduleSlotDoc): FormState {
  return {
    id: slot.id,
    subjectId: slot.subjectId,
    stageId: slot.stageId,
    courseId: slot.courseId ?? "",
    dayOfWeek: String(slot.dayOfWeek),
    startTime: slot.startTime,
    durationMinutes: String(slot.durationMinutes),
    labelEn: slot.label?.en ?? "",
    labelAr: slot.label?.ar ?? "",
  };
}

function toRequestBody(form: FormState) {
  return {
    ...(form.id ? { id: form.id } : {}),
    subjectId: form.subjectId,
    stageId: form.stageId,
    ...(form.courseId ? { courseId: form.courseId } : {}),
    dayOfWeek: Number(form.dayOfWeek),
    startTime: form.startTime,
    durationMinutes: Number(form.durationMinutes),
    ...(form.labelEn || form.labelAr
      ? { label: { ...(form.labelEn ? { en: form.labelEn } : {}), ...(form.labelAr ? { ar: form.labelAr } : {}) } }
      : {}),
  };
}

export function ScheduleManager({ initialSlots }: ScheduleManagerProps) {
  const t = useTranslations("teacherDashboard.schedule");
  const format = useFormatter();
  const [slots, setSlots] = React.useState(initialSlots);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<"save" | "delete" | null>(null);

  const dayOptions = Array.from({ length: 7 }, (_, day) => ({
    value: String(day),
    label: format.dateTime(new Date(Date.UTC(2024, 0, day + 7)), { weekday: "long", timeZone: "UTC" }),
  }));

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function refresh() {
    const res = await fetch("/api/teacher/schedule");
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { slots: ScheduleSlotDoc[] };
    setSlots(body.slots);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("save");
    try {
      const res = await fetch("/api/teacher/schedule", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequestBody(form)),
      });
      if (!res.ok) throw new Error("save");
      await refresh();
      setForm(EMPTY_FORM);
    } catch {
      setError(t("errors.save"));
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteSlot(id: string) {
    setError(null);
    setPendingAction("delete");
    try {
      const res = await fetch("/api/teacher/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete");
      await refresh();
      setForm((current) => (current.id === id ? EMPTY_FORM : current));
    } catch {
      setError(t("errors.delete"));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
            <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
          </div>
          {slots.length === 0 ? (
            <div className="flex min-h-96 flex-col items-center justify-center px-6 py-12 text-center">
              <img
                src="/illustrations/empty-schedule.jpg"
                alt=""
                aria-hidden="true"
                className="mb-6 w-full max-w-xs rounded-lg object-contain"
              />
              <h3 className="text-base font-semibold text-foreground">{t("emptyTitle")}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-foreground/60">{t("emptyDescription")}</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
                <span>{t("columns.when")}</span>
                <span>{t("columns.subject")}</span>
                <span>{t("columns.stage")}</span>
                <span className="text-end">{t("columns.actions")}</span>
              </div>
              {slots.map((slot) => (
                <div key={slot.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 px-3 py-3 text-sm">
                  <span className="text-foreground">
                    {dayOptions[slot.dayOfWeek]?.label} - {slot.startTime} -{" "}
                    {t("duration", { count: slot.durationMinutes })}
                  </span>
                  <span className="text-foreground/70">{slot.subjectId}</span>
                  <span className="text-foreground/70">{slot.stageId}</span>
                  <span className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm(toFormState(slot))}>
                      {t("edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      loading={pendingAction === "delete"}
                      onClick={() => deleteSlot(slot.id)}
                    >
                      {t("delete")}
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Card className="p-0">
          <CardContent className="p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {form.id ? t("editTitle") : t("addTitle")}
              </h2>
              <p className="mt-1 text-xs text-foreground/60">{t("formSubtitle")}</p>
            </div>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label={t("fields.dayOfWeek")}
                  options={dayOptions}
                  value={form.dayOfWeek}
                  onChange={(event) => updateField("dayOfWeek", event.target.value)}
                />
                <Input
                  label={t("fields.startTime")}
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateField("startTime", event.target.value)}
                  required
                />
              </div>
              <Input
                label={t("fields.durationMinutes")}
                type="number"
                min={15}
                max={360}
                step={15}
                value={form.durationMinutes}
                onChange={(event) => updateField("durationMinutes", event.target.value)}
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label={t("fields.subjectId")}
                  value={form.subjectId}
                  onChange={(event) => updateField("subjectId", event.target.value)}
                  required
                />
                <Input
                  label={t("fields.stageId")}
                  value={form.stageId}
                  onChange={(event) => updateField("stageId", event.target.value)}
                  required
                />
                <Input
                  label={t("fields.courseId")}
                  value={form.courseId}
                  onChange={(event) => updateField("courseId", event.target.value)}
                />
              </div>
              <Input
                label={t("fields.labelEn")}
                value={form.labelEn}
                onChange={(event) => updateField("labelEn", event.target.value)}
              />
              <Input
                label={t("fields.labelAr")}
                value={form.labelAr}
                onChange={(event) => updateField("labelAr", event.target.value)}
              />
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={pendingAction === "save"} className="flex-1">
                  {form.id ? t("update") : t("add")}
                </Button>
                {form.id && (
                  <Button type="button" variant="outline" onClick={() => setForm(EMPTY_FORM)}>
                    {t("cancel")}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
