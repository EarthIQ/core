/**
 * Settings - Notifications section (core).
 *
 * Per-user delivery preferences for in-app notifications
 * (GET/PUT ``/api/v1/notifications/preferences``). Toggles apply instantly and
 * are persisted server-side.
 */
import { NOTIFICATION_CATEGORIES, useNotifications } from "@/lib/notifications";

const Row = ({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border-secondary last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {hint ? <div className="text-xs text-text-tertiary mt-0.5">{hint}</div> : null}
      </div>
      <button
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        role="switch"
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-surface-hover border border-border-secondary"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationPrefsSection() {
  const { prefs, updatePrefs, unread } = useNotifications();

  const enabled = prefs?.enabled ?? true;
  const toasts = prefs?.toasts ?? true;
  const sound = prefs?.sound ?? false;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">In-app notifications</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Master switch. When off, no notifications are delivered to you
              {" "}({unread} currently unread).
            </p>
          </div>
        </div>
        <div className="mt-2">
          <Row
            checked={enabled}
            hint="Keep this on to see mentions, access requests, and system updates."
            label="Receive notifications"
            onChange={(v) => updatePrefs({ enabled: v })}
          />
          <Row
            checked={toasts}
            disabled={!enabled}
            hint="Show a pop-up toast when a new notification arrives."
            label="Desktop toasts"
            onChange={(v) => updatePrefs({ toasts: v })}
          />
          <Row
            checked={sound}
            disabled={!enabled}
            hint="Play a soft chime with each new notification."
            label="Sound"
            onChange={(v) => updatePrefs({ sound: v })}
          />
        </div>
      </div>

      <div className="card p-6">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">By category</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Choose which kinds of notifications you want to receive.
          </p>
        </div>
        <div className="mt-2">
          {NOTIFICATION_CATEGORIES.map((c) => (
            <Row
              key={c.id}
              checked={prefs?.categories?.[c.id] ?? true}
              disabled={!enabled}
              label={c.label}
              onChange={(v) => updatePrefs({ categories: { [c.id]: v } })}
            />
          ))}
        </div>
      </div>

      <div className="card p-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">View your notifications</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Everything you have received, with filters and search.
          </p>
        </div>
        <a className="btn btn-primary no-underline" href="/notifications">
          Open notification center
        </a>
      </div>
    </div>
  );
}