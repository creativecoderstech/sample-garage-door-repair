/** Confirmed booking helpers. */

export type BookingRow = {
  id: number;
  service_request_id: number | null;
  name: string;
  email: string | null;
  phone: string;
  service: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_specific_time: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export const serializeBooking = (b: BookingRow) => ({
  id: b.id,
  serviceRequestId: b.service_request_id,
  name: b.name,
  email: b.email,
  phone: b.phone,
  service: b.service,
  description: b.description,
  scheduledDate: b.scheduled_date,
  scheduledTime: b.scheduled_time,
  scheduledSpecificTime: b.scheduled_specific_time ?? null,
  status: b.status,
  source: b.source ?? 'web',
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});
