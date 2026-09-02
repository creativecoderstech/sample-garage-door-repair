/** Soft priority for handyman service requests (not life-safety emergency). */

export const URGENCY_VALUES = ['flexible', 'soon', 'urgent'] as const;
export type Urgency = (typeof URGENCY_VALUES)[number];

export const URGENCY_OPTIONS: Array<{
  value: Urgency;
  label: string;
  hint: string;
}> = [
  {
    value: 'flexible',
    label: 'Flexible',
    hint: 'Whenever works',
  },
  {
    value: 'soon',
    label: 'This week',
    hint: 'Prefer sooner',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    hint: 'Need help quickly',
  },
];

export const URGENCY_LABELS: Record<Urgency, string> = {
  flexible: 'Flexible',
  soon: 'This week',
  urgent: 'Urgent',
};

export function isUrgency(value: string | null | undefined): value is Urgency {
  return value === 'flexible' || value === 'soon' || value === 'urgent';
}
