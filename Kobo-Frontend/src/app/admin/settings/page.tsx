"use client";

import * as React from "react";
import {
  fetchCounties,
  fetchWorkspaceSettings,
  refreshStoredUserProfile,
  syncStoredProfileFromWorkspace,
  updateNotificationPreferences,
  updatePassword,
  updateSecurityPreferences,
  updateWorkspaceOrganization,
  updateWorkspaceProfile,
  type UpdateOrganizationPatch,
  type CompanyWorkspaceSettings,
  type CountyApiRow,
  type NotificationPreferences,
  type WorkspaceSettingsPayload,
} from "@/lib/api";
import {
  Camera,
  Bell,
  Building2,
  KeyRound,
  Menu,
  Save,
  Settings2,
  UserCircle2,
  UserCog,
  Workflow,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";

type Section = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

const sections: Section[] = [
  {
    id: "profile",
    label: "My Profile",
    icon: UserCircle2,
    description: "Admin profile details used across the app.",
  },
  {
    id: "security",
    label: "Password & Security",
    icon: KeyRound,
    description: "Password updates, sessions, and account protection.",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "In-app and email alerts for review workflows.",
  },
  {
    id: "organization",
    label: "Organization & Project",
    icon: Building2,
    description: "Core project defaults and workspace identity.",
  },
  {
    id: "users",
    label: "Users & Roles",
    icon: UserCog,
    description: "Role access policy for platform administrators.",
  },
  {
    id: "data-rules",
    label: "Data Collection Rules",
    icon: Settings2,
    description: "Validation, duplicates, and required data checks.",
  },
  {
    id: "workflow",
    label: "Workflow & Approvals",
    icon: Workflow,
    description: "Submission review path, SLA, and escalations.",
  },
];

const TIMEZONES = [
  "Africa/Nairobi",
  "UTC",
  "Europe/London",
  "America/New_York",
];

const DATE_FORMATS = ["DD MMM, YYYY", "YYYY-MM-DD", "MM/DD/YYYY"];

const PROJECT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active_data_collection", label: "Active Data Collection" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
];

const APPROVAL_MODES = [
  { value: "manual_review", label: "Manual Review" },
  { value: "auto_approve", label: "Auto approve" },
];

const STRICTNESS = [
  { value: "relaxed", label: "Relaxed" },
  { value: "standard", label: "Standard" },
  { value: "strict", label: "Strict" },
];

const MIN_PHOTOS = [
  { value: 0, label: "No minimum" },
  { value: 1, label: "At least 1 photo" },
  { value: 2, label: "At least 2 photos" },
];

function InputRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr] md:items-center">
      <label className="text-[12px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function textInput(base = "") {
  return `h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${base}`.trim();
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-[12px] text-slate-500">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const [active, setActive] = React.useState(sections[0].id);
  const [workspace, setWorkspace] = React.useState<WorkspaceSettingsPayload | null>(null);
  const [counties, setCounties] = React.useState<CountyApiRow[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);

  const [profileName, setProfileName] = React.useState("");
  const [profilePhone, setProfilePhone] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = React.useState("");
  const [companyCode, setCompanyCode] = React.useState("");
  const [defaultCountyId, setDefaultCountyId] = React.useState<number | null>(null);
  const [timezone, setTimezone] = React.useState("Africa/Nairobi");
  const [dateFormat, setDateFormat] = React.useState("DD MMM, YYYY");
  const [projectStatusDefault, setProjectStatusDefault] = React.useState("active_data_collection");
  const [savingCompany, setSavingCompany] = React.useState(false);

  const [usersRoles, setUsersRoles] = React.useState<CompanyWorkspaceSettings["users_roles"] | null>(
    null,
  );
  const [dataRules, setDataRules] = React.useState<CompanyWorkspaceSettings["data_collection_rules"] | null>(
    null,
  );
  const [workflow, setWorkflow] = React.useState<CompanyWorkspaceSettings["workflow_approvals"] | null>(null);
  const [savingSection, setSavingSection] = React.useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [signOutOthers, setSignOutOthers] = React.useState(true);
  const [require2fa, setRequire2fa] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [notifPrefs, setNotifPrefs] = React.useState<NotificationPreferences | null>(null);
  const [savingNotif, setSavingNotif] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, cList] = await Promise.all([fetchWorkspaceSettings(), fetchCounties()]);
        if (!cancelled) {
          setWorkspace(data);
          syncStoredProfileFromWorkspace(data);
          setCounties(cList);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load settings");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!workspace) {
      return;
    }
    setProfileName(workspace.user.name);
    setProfilePhone(workspace.user.phone ?? "");
    setNotifPrefs(workspace.notification_preferences);
    const sec = workspace.security_preferences;
    setSignOutOthers(sec.sign_out_other_sessions_after_password_change);
    setRequire2fa(sec.require_two_factor);

    if (workspace.company) {
      const c = workspace.company;
      setCompanyName(c.name);
      setCompanyCode(c.code ?? "");
      setDefaultCountyId(c.default_county_id);
      setTimezone(c.timezone);
      setDateFormat(c.date_format);
      setProjectStatusDefault(c.project_status_default);
      setUsersRoles(c.settings.users_roles);
      setDataRules(c.settings.data_collection_rules);
      setWorkflow(c.settings.workflow_approvals);
    }
  }, [workspace]);

  const canEditOrg =
    workspace?.user.role?.slug === "company_admin" ||
    workspace?.user.role?.slug === "super_admin";

  const handleSaveProfile = async () => {
    setSaveMsg(null);
    setSavingProfile(true);
    try {
      const next = await updateWorkspaceProfile({
        name: profileName.trim() || undefined,
        phone: profilePhone.trim() || null,
      });
      setWorkspace(next);
      syncStoredProfileFromWorkspace(next);
      void refreshStoredUserProfile().catch(() => {});
      setSaveMsg("Profile saved.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setSaveMsg(null);
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      if (profileName.trim()) {
        fd.append("name", profileName.trim());
      }
      if (profilePhone.trim()) {
        fd.append("phone", profilePhone.trim());
      }
      const next = await updateWorkspaceProfile(fd);
      setWorkspace(next);
      syncStoredProfileFromWorkspace(next);
      void refreshStoredUserProfile().catch(() => {});
      setSaveMsg("Photo updated.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setSavingProfile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setSaveMsg(null);
    setSavingProfile(true);
    try {
      const next = await updateWorkspaceProfile({ remove_avatar: true });
      setWorkspace(next);
      syncStoredProfileFromWorkspace(next);
      void refreshStoredUserProfile().catch(() => {});
      setSaveMsg("Photo removed.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!workspace?.company?.id) {
      setSaveMsg("No organization on this account.");
      return;
    }
    setSaveMsg(null);
    setSavingCompany(true);
    try {
      const next = await updateWorkspaceOrganization({
        name: companyName.trim() || undefined,
        code: companyCode.trim() || null,
        company_id: workspace.company.id,
        default_county_id: defaultCountyId,
        timezone,
        date_format: dateFormat,
        project_status_default: projectStatusDefault,
      });
      setWorkspace(next);
      setSaveMsg("Organization saved.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save organization");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSavePassword = async () => {
    setSaveMsg(null);
    setSavingPassword(true);
    try {
      await updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
        sign_out_other_sessions: signOutOthers,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const sec = await updateSecurityPreferences({
        sign_out_other_sessions_after_password_change: signOutOthers,
        require_two_factor: require2fa,
      });
      setWorkspace(sec);
      setSaveMsg("Password updated.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSecurityCheckboxPersist = async (nextSignOut: boolean, next2fa: boolean) => {
    setSaveMsg(null);
    try {
      const next = await updateSecurityPreferences({
        sign_out_other_sessions_after_password_change: nextSignOut,
        require_two_factor: next2fa,
      });
      setWorkspace(next);
      setSaveMsg("Security preferences saved.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save security preferences");
    }
  };

  const handleSaveNotifications = async () => {
    if (!notifPrefs) {
      return;
    }
    setSaveMsg(null);
    setSavingNotif(true);
    try {
      const res = await updateNotificationPreferences(notifPrefs);
      setWorkspace((prev) =>
        prev
          ? { ...prev, notification_preferences: res.notification_preferences }
          : prev,
      );
      setNotifPrefs(res.notification_preferences);
      setSaveMsg("Notification preferences saved.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save notifications");
    } finally {
      setSavingNotif(false);
    }
  };

  const patchCompanySection = async (
    sectionKey: string,
    partial: UpdateOrganizationPatch,
  ): Promise<void> => {
    if (!workspace?.company?.id) {
      setSaveMsg("No organization on this account.");
      return;
    }
    setSaveMsg(null);
    setSavingSection(sectionKey);
    try {
      const next = await updateWorkspaceOrganization({
        company_id: workspace.company.id,
        ...partial,
      });
      setWorkspace(next);
      setSaveMsg("Saved.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingSection(null);
    }
  };

  const activeSection = sections.find((s) => s.id === active) ?? sections[0];
  const ActiveIcon = activeSection.icon;

  const avatarUrl =
    workspace?.user.avatar_url ??
    (workspace
      ? `https://ui-avatars.com/api/?size=112&background=ecfdf5&color=065f46&name=${encodeURIComponent(workspace.user.name)}`
      : "https://ui-avatars.com/api/?size=112&background=f1f5f9&color=64748b&name=User");

  const np = notifPrefs;

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
                onClick={toggleSidebar}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold text-slate-900">Settings</h1>
                <p className="text-[12px] text-slate-500">
                  Manage platform configuration and operational defaults
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <NotificationBell />
            </div>
          </header>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}
          {saveMsg && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                saveMsg.endsWith("saved.") || saveMsg.endsWith("updated.") || saveMsg === "Saved."
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {saveMsg}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,280px)_1fr] xl:grid-cols-[290px_1fr]">
            <aside className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-2 px-2 pt-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Configuration Areas
              </div>
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const activeClass =
                    section.id === active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "text-slate-700 hover:bg-slate-50";
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActive(section.id)}
                      className={`w-full rounded-xl border border-transparent px-3 py-2 text-left transition-colors ${activeClass}`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon size={15} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[12px] font-semibold">{section.label}</p>
                          <p className="mt-0.5 text-[11px] opacity-80">{section.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-w-0 space-y-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-emerald-800">
                  <ActiveIcon size={16} />
                  <p className="text-[13px] font-semibold">{activeSection.label}</p>
                </div>
                <p className="mt-1 text-[12px] text-emerald-700">{activeSection.description}</p>
              </div>

              {active === "profile" && (
                <SettingsCard
                  title="My Profile"
                  description="Manage your personal admin identity and contact details."
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleAvatarSelected(e)}
                  />
                  <InputRow label="Profile Photo">
                    <div className="flex flex-wrap items-center gap-3">
                      <img
                        src={avatarUrl}
                        width={56}
                        height={56}
                        alt=""
                        className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                        key={workspace?.user.avatar_url ?? "placeholder"}
                      />
                      <button
                        type="button"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={savingProfile || !workspace}
                      >
                        <Camera size={15} />
                        Upload New Photo
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 hover:bg-slate-50"
                        onClick={() => void handleRemoveAvatar()}
                        disabled={savingProfile || !workspace?.user.avatar_url}
                      >
                        Remove
                      </button>
                    </div>
                  </InputRow>
                  <InputRow label="Full Name">
                    <input
                      className={textInput()}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder={workspace ? undefined : "Loading…"}
                    />
                  </InputRow>
                  <InputRow label="Email Address">
                    <input
                      className={textInput()}
                      readOnly
                      value={workspace?.user.email ?? ""}
                      placeholder={workspace ? undefined : "Loading…"}
                    />
                  </InputRow>
                  <InputRow label="Phone Number">
                    <input
                      className={textInput()}
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder={workspace ? undefined : "Loading…"}
                    />
                  </InputRow>
                  <InputRow label="Role">
                    <input
                      className={textInput("max-w-[260px]")}
                      readOnly
                      value={workspace?.user.role?.name ?? ""}
                      placeholder={workspace ? undefined : "Loading…"}
                    />
                  </InputRow>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile()}
                      disabled={savingProfile || !workspace}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Save size={14} />
                      {savingProfile ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </SettingsCard>
              )}

              {active === "security" && (
                <SettingsCard
                  title="Password & Security"
                  description="Update credentials and account access safeguards."
                >
                  <InputRow label="Current Password">
                    <input
                      type="password"
                      className={textInput("max-w-[320px]")}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </InputRow>
                  <InputRow label="New Password">
                    <input
                      type="password"
                      className={textInput("max-w-[320px]")}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </InputRow>
                  <InputRow label="Confirm Password">
                    <input
                      type="password"
                      className={textInput("max-w-[320px]")}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </InputRow>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={signOutOthers}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setSignOutOthers(v);
                        void handleSecurityCheckboxPersist(v, require2fa);
                      }}
                    />
                    Sign out of all other devices after password change
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={require2fa}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setRequire2fa(v);
                        void handleSecurityCheckboxPersist(signOutOthers, v);
                      }}
                    />
                    Require 2FA for this account
                  </label>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSavePassword()}
                      disabled={savingPassword || !workspace}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Save size={14} />
                      {savingPassword ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </SettingsCard>
              )}

              {active === "notifications" && np && (
                <SettingsCard
                  title="Notifications"
                  description="Choose operational events that should notify you."
                >
                  {(
                    [
                      ["new_submission", "New submission alerts"],
                      ["sla_breach", "Pending approvals over SLA"],
                      ["rejected_submission", "Rejected submission alerts"],
                      ["weekly_summary", "Weekly summary report"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={np[key]}
                        onChange={(e) =>
                          setNotifPrefs({ ...np, [key]: e.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[12px] font-medium text-slate-600">Channels</p>
                    <label className="flex items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={np.channels.in_app}
                        onChange={(e) =>
                          setNotifPrefs({
                            ...np,
                            channels: { ...np.channels, in_app: e.target.checked },
                          })
                        }
                      />
                      In-app notifications
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={np.channels.email}
                        onChange={(e) =>
                          setNotifPrefs({
                            ...np,
                            channels: { ...np.channels, email: e.target.checked },
                          })
                        }
                      />
                      Email
                    </label>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveNotifications()}
                      disabled={savingNotif || !workspace}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Save size={14} />
                      {savingNotif ? "Saving…" : "Save notifications"}
                    </button>
                  </div>
                </SettingsCard>
              )}

              {active === "organization" && (
                <SettingsCard
                  title="Organization & Project"
                  description="Core workspace identity and project defaults used by field operations."
                >
                  <InputRow label="Organization Name">
                    <input
                      className={textInput()}
                      readOnly={!canEditOrg}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={workspace ? "—" : "Loading…"}
                    />
                  </InputRow>
                  <InputRow label="Organization Code">
                    <input
                      className={textInput()}
                      readOnly={!canEditOrg}
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      placeholder={workspace?.company ? "—" : "Loading…"}
                    />
                  </InputRow>
                  <InputRow label="Default County">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={defaultCountyId ?? ""}
                      onChange={(e) =>
                        setDefaultCountyId(e.target.value ? Number(e.target.value) : null)
                      }
                    >
                      <option value="">— Select county —</option>
                      {counties.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  <InputRow label="Timezone">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  <InputRow label="Date Format">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                    >
                      {DATE_FORMATS.map((df) => (
                        <option key={df} value={df}>
                          {df}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  <InputRow label="Project Status">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={projectStatusDefault}
                      onChange={(e) => setProjectStatusDefault(e.target.value)}
                    >
                      {PROJECT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  {canEditOrg && workspace?.company && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveOrganization()}
                        disabled={savingCompany}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Save size={14} />
                        {savingCompany ? "Saving…" : "Save organization"}
                      </button>
                    </div>
                  )}
                </SettingsCard>
              )}

              {active === "users" && usersRoles && (
                <SettingsCard
                  title="Users & Roles"
                  description="Set key role permissions for internal platform users."
                >
                  {(
                    [
                      ["super_admin_manage_config", "Super Admin can manage system configuration"],
                      ["data_manager_approve_reject", "Data Manager can approve or reject submissions"],
                      ["field_supervisor_review", "Field Supervisor can review team submissions"],
                      ["viewer_reports_only", "Viewer can access reports and dashboards only"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={usersRoles[key]}
                        onChange={(e) =>
                          setUsersRoles({ ...usersRoles, [key]: e.target.checked })
                        }
                        disabled={!canEditOrg}
                      />
                      {label}
                    </label>
                  ))}
                  {canEditOrg && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          void patchCompanySection("users", { users_roles: usersRoles })
                        }
                        disabled={savingSection === "users"}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Save size={14} />
                        {savingSection === "users" ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </SettingsCard>
              )}

              {active === "data-rules" && dataRules && (
                <SettingsCard
                  title="Data Collection Rules"
                  description="Define submission validation and data quality checks."
                >
                  <label className="flex items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={dataRules.require_phone_gps}
                      onChange={(e) =>
                        setDataRules({ ...dataRules, require_phone_gps: e.target.checked })
                      }
                      disabled={!canEditOrg}
                    />
                    Require phone number and GPS coordinates before submit
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={dataRules.duplicate_detect_radius_m > 0}
                      onChange={(e) =>
                        setDataRules({
                          ...dataRules,
                          duplicate_detect_radius_m: e.target.checked ? 200 : 0,
                        })
                      }
                      disabled={!canEditOrg}
                    />
                    Detect duplicates by name + location radius (200m)
                  </label>
                  <InputRow label="Validation Strictness">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={dataRules.validation_strictness}
                      onChange={(e) =>
                        setDataRules({ ...dataRules, validation_strictness: e.target.value })
                      }
                    >
                      {STRICTNESS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  <InputRow label="Minimum Photo Count">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={dataRules.min_photo_count}
                      onChange={(e) =>
                        setDataRules({
                          ...dataRules,
                          min_photo_count: Number(e.target.value),
                        })
                      }
                    >
                      {MIN_PHOTOS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  {canEditOrg && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          void patchCompanySection("data-rules", {
                            data_collection_rules: dataRules,
                          })
                        }
                        disabled={savingSection === "data-rules"}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Save size={14} />
                        {savingSection === "data-rules" ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </SettingsCard>
              )}

              {active === "workflow" && workflow && (
                <SettingsCard
                  title="Workflow & Approvals"
                  description="Tune how records move from submission to approval."
                >
                  <InputRow label="Approval Mode">
                    <select
                      className={`${textInput("w-full cursor-pointer pr-8")}`}
                      disabled={!canEditOrg}
                      value={workflow.approval_mode}
                      onChange={(e) =>
                        setWorkflow({ ...workflow, approval_mode: e.target.value })
                      }
                    >
                      {APPROVAL_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </InputRow>
                  <InputRow label="SLA Timer (hours)">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      className={textInput("max-w-[200px]")}
                      disabled={!canEditOrg}
                      value={workflow.sla_hours}
                      onChange={(e) =>
                        setWorkflow({
                          ...workflow,
                          sla_hours: Number(e.target.value) || 48,
                        })
                      }
                    />
                  </InputRow>
                  {canEditOrg && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          void patchCompanySection("workflow", {
                            workflow_approvals: workflow,
                          })
                        }
                        disabled={savingSection === "workflow"}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Save size={14} />
                        {savingSection === "workflow" ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </SettingsCard>
              )}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
