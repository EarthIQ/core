/**
 * Settings — Profile section (core).
 *
 * Edit the signed-in user's public profile (GET/PUT ``/api/profile/me``) and
 * change the password (POST ``/api/profile/me/password``).
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  job_title: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  preferred_timezone: string | null;
  created_at: string;
}

// A curated list of commonly-used IANA zones (Intl may add more).
const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function timezoneOptions(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf?.("timeZone");
    if (list && list.length) {
      const sorted = [...list].sort();
      if (!sorted.includes("UTC")) sorted.unshift("UTC");
      return sorted;
    }
  } catch {
    /* fall through */
  }
  return FALLBACK_TIMEZONES;
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export default function ProfileSection() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    job_title: "",
    location: "",
    phone: "",
    website: "",
    preferred_timezone: "",
  });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);

  // Password card state.
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    api
      .get<Profile>("/api/profile/me")
      .then((p) => {
        setProfile(p);
        setForm({
          full_name: p.full_name ?? "",
          bio: p.bio ?? "",
          avatar_url: p.avatar_url ?? "",
          job_title: p.job_title ?? "",
          location: p.location ?? "",
          phone: p.phone ?? "",
          website: p.website ?? "",
          preferred_timezone:
            p.preferred_timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone ??
            "",
        });
      })
      .catch(() => setStatus({ kind: "error", message: "Could not load your profile." }));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  const save = useCallback(async () => {
    if (!profile) return;
    setStatus({ kind: "saving" });
    try {
      const updated = await api.put<Profile>("/api/profile/me", {
        full_name: form.full_name || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        job_title: form.job_title || null,
        location: form.location || null,
        phone: form.phone || null,
        website: form.website || null,
        preferred_timezone: form.preferred_timezone || null,
      });
      setProfile(updated);
      setDirty(false);
      setStatus({ kind: "ok" });
      refreshUser?.();
      setTimeout(() => setStatus({ kind: "idle" }), 2500);
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Save failed" });
    }
  }, [form, profile, refreshUser]);

  const changePassword = useCallback(async () => {
    if (pw.next.length < 8) {
      setPwStatus({ kind: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwStatus({ kind: "error", message: "New passwords do not match." });
      return;
    }
    setPwStatus({ kind: "saving" });
    try {
      await api.post("/api/profile/me/password", {
        current_password: pw.current,
        new_password: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
      setPwStatus({ kind: "ok" });
      setTimeout(() => setPwStatus({ kind: "idle" }), 2500);
    } catch (e) {
      setPwStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Password change failed",
      });
    }
  }, [pw]);

  if (!profile) {
    return (
      <div className="p-8 text-center text-sm text-text-secondary">
        {status.kind === "error" ? status.message : "Loading profile…"}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* ── Identity card ── */}
      <div className="card p-5 flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="avatar"
            className="w-16 h-16 rounded-full object-cover border border-border-primary"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/15 text-primary text-xl font-bold flex items-center justify-center border border-primary/20">
            {initials(profile.full_name || profile.email)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-base font-semibold text-text-primary truncate">
            {profile.full_name || "Unnamed user"}
          </div>
          <div className="text-xs text-text-secondary truncate">{profile.email}</div>
          {profile.job_title && (
            <div className="text-xs text-text-tertiary mt-0.5">{profile.job_title}</div>
          )}
          <div className="text-[0.65rem] text-text-tertiary mt-1">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* ── Profile form ── */}
      <div className="card p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Profile details</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            This is how you appear to teammates across the platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-field">
            <label className="form-label">Full name</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Job title</label>
            <input
              className="input"
              value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder="Hydrologist"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Location</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Bonn, Germany"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+49 30 123456"
            />
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Website / profile</label>
            <input
              className="input"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Bio</label>
            <textarea
              className="input min-h-[5rem] resize-y"
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="A short line about what you work on…"
              maxLength={4000}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Timezone</label>
            <select
              className="input"
              value={form.preferred_timezone}
              onChange={(e) => set("preferred_timezone", e.target.value)}
            >
              <option value="">Auto (browser)</option>
              {timezoneOptions().map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Avatar URL</label>
            <input
              className="input"
              value={form.avatar_url}
              onChange={(e) => set("avatar_url", e.target.value)}
              placeholder="https://…/me.jpg"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-1">
          {status.kind === "ok" && <span className="text-xs text-success">✓ Saved</span>}
          {status.kind === "error" && <span className="text-xs text-error">{status.message}</span>}
          <button className="btn btn-primary" disabled={!dirty || status.kind === "saving"} onClick={save}>
            {status.kind === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Security card ── */}
      <div className="card p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Security</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Change your password. Minimum 8 characters with upper, lower and a number.
          </p>
        </div>
        <div className="form-field">
          <label className="form-label">Current password</label>
          <input
            type="password"
            className="input"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            autoComplete="current-password"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-field">
            <label className="form-label">New password</label>
            <input
              type="password"
              className="input"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {pwStatus.kind === "ok" && <span className="text-xs text-success">✓ Password updated</span>}
          {pwStatus.kind === "error" && (
            <span className="text-xs text-error">{pwStatus.message}</span>
          )}
          <button
            className="btn btn-secondary"
            disabled={pwStatus.kind === "saving" || !pw.current || !pw.next || !pw.confirm}
            onClick={changePassword}
          >
            {pwStatus.kind === "saving" ? "Updating…" : "Change password"}
          </button>
        </div>
      </div>
    </div>
  );
}