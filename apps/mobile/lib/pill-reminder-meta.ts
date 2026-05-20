/** Metadata stored JSON-encoded in CustomReminder.notes (see PillCreateWizard). */
export type PillReminderMeta = {
  v: 1;
  form: string;
  frequency: string;
  food: string;
  color: string;
  shape: string;
  groupId: string;
  label: string;
};

export function parseReminderMeta(notes: string | null | undefined): PillReminderMeta | null {
  if (!notes?.trim()) return null;
  try {
    const p = JSON.parse(notes) as PillReminderMeta & { groupID?: string };
    if (p && p.v === 1 && typeof p.label === 'string' && p.label.trim()) {
      return { ...p, groupId: p.groupId ?? p.groupID ?? '' };
    }
  } catch {
    /* plain-text notes */
  }
  return null;
}

/** User-visible notification / list subtitle (never raw JSON). */
export function formatPillNotificationBody(reminder: {
  time: string;
  notes?: string | null;
}): string {
  const meta = parseReminderMeta(reminder.notes);
  if (meta?.label) return `${reminder.time} · ${meta.label}`;

  const plain = reminder.notes?.trim();
  if (plain && !plain.startsWith('{')) return `${reminder.time} · ${plain}`;

  return reminder.time;
}

/** Fixes already-scheduled notifications that still have JSON in the body field. */
export function humanizePillNotificationText(body: string | undefined, title?: string): string {
  const raw = body?.trim();
  if (!raw) return title?.trim() || '';
  if (!raw.startsWith('{')) return raw;

  const meta = parseReminderMeta(raw);
  if (meta?.label) return meta.label;

  const labelMatch = raw.match(/"label"\s*:\s*"([^"]+)"/);
  if (labelMatch?.[1]) return labelMatch[1];

  return title?.trim() || '';
}
