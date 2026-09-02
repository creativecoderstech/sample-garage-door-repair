/**
 * Owner/client email notification helpers (Cloudflare Email Sending).
 * SMS/Twilio is deferred — kept as dormant helpers, never warned on in this phase.
 * Soft-fail when binding/settings are not configured.
 */

export type NotifyEnv = {
  DB: D1Database;
  EMAIL?: {
    send: (msg: {
      to: string | string[];
      from: { email: string; name?: string } | string;
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
    }) => Promise<{ messageId?: string }>;
  };
  /** Future: Twilio SMS (unused in email-only phase). */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
};

async function readSetting(db: D1Database, key: string): Promise<string> {
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value?.trim() ?? "";
}

export async function readNotifySettings(db: D1Database) {
  const [ownerEmail, notifyFromEmail, notifyFromName, phone] = await Promise.all([
    readSetting(db, "owner_email"),
    readSetting(db, "notify_from_email"),
    readSetting(db, "notify_from_name"),
    readSetting(db, "phone"),
  ]);
  return {
    ownerEmail,
    notifyFromEmail,
    notifyFromName: notifyFromName || "Mike's Handyman Service",
    phone: phone || "(512) 244-8550",
  };
}

export function getEmailNotifyStatus(
  env: NotifyEnv,
  settings: Awaited<ReturnType<typeof readNotifySettings>>,
) {
  const ownerEmailSet = Boolean(settings.ownerEmail);
  const notifyFromEmailSet = Boolean(settings.notifyFromEmail);
  const emailBindingReady = typeof env.EMAIL?.send === "function";
  const emailReady = ownerEmailSet && notifyFromEmailSet && emailBindingReady;
  return {
    ownerEmailSet,
    notifyFromEmailSet,
    emailBindingReady,
    emailReady,
    smsEnabled: false,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendEmail(
  env: NotifyEnv,
  args: {
    to: string;
    subject: string;
    text: string;
    html: string;
  },
): Promise<{ sent: boolean; warning?: string }> {
  const settings = await readNotifySettings(env.DB);
  if (!args.to) {
    return { sent: false, warning: "No recipient email configured." };
  }
  if (!settings.notifyFromEmail) {
    return {
      sent: false,
      warning: "From email is not set in Admin → Settings.",
    };
  }
  if (!env.EMAIL?.send) {
    return {
      sent: false,
      warning: "Email sending binding is not configured on this Worker.",
    };
  }

  try {
    await env.EMAIL.send({
      to: args.to,
      from: { email: settings.notifyFromEmail, name: settings.notifyFromName },
      subject: args.subject,
      text: args.text,
      html: args.html,
      replyTo: settings.ownerEmail || settings.notifyFromEmail,
    });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed", err);
    return {
      sent: false,
      warning: err instanceof Error ? err.message : "Email send failed.",
    };
  }
}

/** Invite email for a new Admin/Member (soft-fail if email not configured). */
export async function notifyUserInvite(
  env: NotifyEnv,
  args: {
    to: string;
    role: string;
    adminOrigin: string;
  },
): Promise<{ emailSent: boolean; warning?: string }> {
  const roleLabel =
    args.role === "admin"
      ? "Admin"
      : args.role === "member"
        ? "Member"
        : args.role;
  const loginUrl = args.adminOrigin.replace(/\/$/, "");
  const text = [
    `You've been invited to Mike's Handyman Service as ${roleLabel}.`,
    "",
    `Sign in with Google: ${loginUrl}`,
    "",
    "Use the same Google account email this invite was sent to.",
  ].join("\n");
  const html = `
    <p>You've been invited to <strong>Mike's Handyman Service</strong> as <strong>${escapeHtml(roleLabel)}</strong>.</p>
    <p><a href="${escapeHtml(loginUrl)}">Sign in with Google</a></p>
    <p>Use the same Google account email this invite was sent to.</p>
  `;
  const result = await sendEmail(env, {
    to: args.to,
    subject: `You're invited to Mike's Handyman Service Admin (${roleLabel})`,
    text,
    html,
  });
  return { emailSent: result.sent, warning: result.warning };
}

export async function notifyOwnerNewServiceRequest(
  env: NotifyEnv,
  request: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    service: string;
    description: string;
    preferredDate: string | null;
    preferredTime: string | null;
    urgency?: string;
    photoCount?: number;
    jobAddress?: string | null;
  },
): Promise<{ emailSent: boolean; warning?: string }> {
  const settings = await readNotifySettings(env.DB);
  if (!settings.ownerEmail) {
    return {
      emailSent: false,
      warning: "Owner email is not set in Admin → Settings.",
    };
  }

  const slot = [request.preferredDate, request.preferredTime]
    .filter(Boolean)
    .join(" · ");
  const urgencyLabel =
    request.urgency === "urgent"
      ? "Urgent"
      : request.urgency === "soon"
        ? "This week"
        : "Flexible";
  const photoLine =
    request.photoCount && request.photoCount > 0
      ? `${request.photoCount} photo${request.photoCount === 1 ? "" : "s"} attached (view in Admin)`
      : null;
  const addressLine = request.jobAddress ? `Location: ${request.jobAddress}` : null;
  const mapsUrl = request.jobAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(request.jobAddress)}`
    : null;
  const text = [
    `New service request #${request.id}`,
    `Name: ${request.name}`,
    `Phone: ${request.phone}`,
    request.email ? `Email: ${request.email}` : null,
    `Service: ${request.service}`,
    `Priority: ${urgencyLabel}`,
    slot ? `Preferred: ${slot}` : null,
    addressLine,
    photoLine,
    "",
    request.description,
    "",
    "Review and confirm in Admin → Service Requests.",
  ]
    .filter((line) => line != null)
    .join("\n");

  const html = `
    <div style="font-family:Outfit,Inter,sans-serif;color:#0f291c">
      <h2 style="margin:0 0 12px">New service request #${request.id}</h2>
      <p><strong>${escapeHtml(request.name)}</strong> · ${escapeHtml(request.phone)}${
        request.email ? ` · ${escapeHtml(request.email)}` : ""
      }</p>
      <p><strong>Service:</strong> ${escapeHtml(request.service)}</p>
      <p><strong>Priority:</strong> ${escapeHtml(urgencyLabel)}</p>
      ${slot ? `<p><strong>Preferred:</strong> ${escapeHtml(slot)}</p>` : ""}
      ${mapsUrl ? `<p><strong>Location:</strong> <a href="${escapeHtml(mapsUrl)}">${escapeHtml(request.jobAddress!)}</a></p>` : ""}
      ${photoLine ? `<p><strong>Photos:</strong> ${escapeHtml(photoLine)}</p>` : ""}
      <p style="white-space:pre-wrap">${escapeHtml(request.description)}</p>
      <p>Review and confirm in Admin → Service Requests.</p>
    </div>
  `;

  const prefix = request.urgency === "urgent" ? "[Urgent] " : "";
  const result = await sendEmail(env, {
    to: settings.ownerEmail,
    subject: `${prefix}New service request: ${request.service} — ${request.name}`,
    text,
    html,
  });
  return { emailSent: result.sent, warning: result.warning };
}

/**
 * Polite thank-you email sent when the owner marks a booking completed.
 * Invites the customer to leave a review on the site. Soft-fails like the
 * other client notifications (no email on file → skipped with a warning).
 */
export async function notifyClientJobCompleted(
  env: NotifyEnv,
  booking: {
    name: string;
    email: string | null;
    service: string;
  },
): Promise<{ emailSent: boolean; warning?: string }> {
  if (!booking.email) {
    return {
      emailSent: false,
      warning: "Client has no email — completion email skipped.",
    };
  }

  const settings = await readNotifySettings(env.DB);
  const reviewUrl = "https://sample-handyman.com/#testimonials";

  const text = [
    `Hi ${booking.name},`,
    "",
    `Your ${booking.service} job is complete — thank you so much for choosing Mike's Handyman Service! It was a pleasure taking care of your home.`,
    "",
    "If you have a moment, we'd be grateful if you shared your experience. Your review helps neighbors find honest, reliable help:",
    reviewUrl,
    "",
    `Need anything else? Just reply to this email or call ${settings.phone} — we're always happy to help.`,
    "",
    "Warm regards,",
    "Mike — Mike's Handyman Service",
  ].join("\n");

  const html = `
    <div style="font-family:Outfit,Inter,sans-serif;color:#0f291c">
      <h2 style="margin:0 0 12px">Thank you — your job is complete!</h2>
      <p>Hi ${escapeHtml(booking.name)},</p>
      <p>Your <strong>${escapeHtml(booking.service)}</strong> job is complete — thank you so much for choosing <strong>Mike's Handyman Service</strong>! It was a pleasure taking care of your home.</p>
      <p>If you have a moment, we'd be grateful if you shared your experience. Your review helps neighbors find honest, reliable help:</p>
      <p style="margin:20px 0">
        <a href="${reviewUrl}"
           style="background:#1d5c3f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600;display:inline-block">
          Leave us a review
        </a>
      </p>
      <p>Need anything else? Just reply to this email or call <a href="tel:${escapeHtml(settings.phone)}">${escapeHtml(settings.phone)}</a> — we're always happy to help.</p>
      <p>Warm regards,<br>Mike — Mike's Handyman Service</p>
    </div>
  `;

  const result = await sendEmail(env, {
    to: booking.email,
    subject: `Thank you, ${booking.name}! Your ${booking.service} job is complete`,
    text,
    html,
  });
  return { emailSent: result.sent, warning: result.warning };
}

export async function notifyClientBookingConfirmed(
  env: NotifyEnv,
  booking: {
    name: string;
    phone: string;
    email: string | null;
    service: string;
    scheduledDate: string;
    scheduledTime: string;
    scheduledSpecificTime?: string | null;
  },
): Promise<{ emailSent: boolean; smsSent: boolean; warning?: string }> {
  const settings = await readNotifySettings(env.DB);
  const windowLabel =
    booking.scheduledTime === 'morning'
      ? 'Morning'
      : booking.scheduledTime === 'afternoon'
        ? 'Afternoon'
        : booking.scheduledTime === 'evening'
          ? 'Evening'
          : booking.scheduledTime;
  const timeLabel = booking.scheduledSpecificTime
    ? `${windowLabel} · ${booking.scheduledSpecificTime}`
    : windowLabel;
  const when = `${booking.scheduledDate} (${timeLabel})`;
  const text =
    `Hi ${booking.name}, your ${booking.service} request with Mike's Handyman Service is confirmed for ${when}. ` +
    `Questions? Call ${settings.phone}.`;

  // Email-only phase: never attempt SMS / never warn about missing Twilio.
  if (!booking.email) {
    return {
      emailSent: false,
      smsSent: false,
      warning: "Client has no email — confirmation email skipped.",
    };
  }

  const html = `
    <div style="font-family:Outfit,Inter,sans-serif;color:#0f291c">
      <h2 style="margin:0 0 12px">Your booking is confirmed</h2>
      <p>Hi ${escapeHtml(booking.name)},</p>
      <p>Your <strong>${escapeHtml(booking.service)}</strong> request is confirmed for <strong>${escapeHtml(when)}</strong>.</p>
      <p>Questions? Call <a href="tel:${escapeHtml(settings.phone)}">${escapeHtml(settings.phone)}</a>.</p>
      <p>— Mike's Handyman Service</p>
    </div>
  `;
  const emailResult = await sendEmail(env, {
    to: booking.email,
    subject: `Booking confirmed — ${booking.service} on ${booking.scheduledDate}`,
    text,
    html,
  });

  return {
    emailSent: emailResult.sent,
    smsSent: false,
    warning: emailResult.warning,
  };
}
