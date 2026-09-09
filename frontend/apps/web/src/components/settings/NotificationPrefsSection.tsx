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
    <div className="border-border-secondary flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-text-primary text-sm font-medium">{label}</div>
        {hint ? (
          <div className="text-text-tertiary mt-0.5 text-xs">{hint}</div>
        ) : null}
      </div>
      <button
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        role="switch"
        className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          checked
            ? "bg-primary"
            : "bg-surface-hover border-border-secondary border"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
};

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
            <h3 className="text-text-primary text-sm font-semibold">
              In-app notifications
            </h3>
            <p className="text-text-secondary mt-0.5 text-xs">
              Master switch. When off, no notifications are delivered to you (
              {unread} currently unread).
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
          <h3 className="text-text-primary text-sm font-semibold">
            By category
          </h3>
          <p className="text-text-secondary mt-0.5 text-xs">
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

      <div className="card flex items-center justify-between gap-4 p-6">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">
            View your notifications
          </h3>
          <p className="text-text-secondary mt-0.5 text-xs">
            Everything you have received, with filters and search.
          </p>
        </div>
        <a
          className="btn btn-primary no-underline"
          href="/notifications"
        >
          Open notification center
        </a>
      </div>
    </div>
  );
}
