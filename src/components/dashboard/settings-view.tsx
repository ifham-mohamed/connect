"use client";
import type { DashboardData } from "@/lib/types";
import {
  ArrowDownToLine,
  Database,
  LogOut,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  accountInitials,
  AiUsageControls,
  experienceNames,
  PerformanceCostPanel,
  SecurityActivity,
  View,
} from "./shared";

import type { UserPreferences, WorkMode } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";

interface Props {
  isOwner: boolean;
  data: DashboardData;
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  action: (
    actionName: string,
    id?: string,
    value?: unknown,
  ) => Promise<unknown>;
  setToast: Dispatch<SetStateAction<string>>;
  signOut: () => Promise<void>;
  preferences: UserPreferences;
  preferenceRoles: string[];
  preferenceLocations: string[];
  preferenceWorkModes: WorkMode[];
  navigate: (next: View, event?: React.MouseEvent<HTMLElement>) => void;
}
export function SettingsView({
  isOwner,
  data,
  profileName,
  setProfileName,
  action,
  setToast,
  signOut,
  preferences,
  preferenceRoles,
  preferenceLocations,
  preferenceWorkModes,
  navigate,
}: Props) {
  const aiAnalysisEnabled = preferences.aiAnalysisEnabled !== false;
  return (
    <div className="settings-grid">
      <section className="settings-overview">
        <div className="settings-overview-icon">
          <Settings2 size={24} />
        </div>
        <div>
          <small>YOUR WORKSPACE</small>
          <h2>Made around how you search.</h2>
          <p>
            Keep your account details, search preferences, and access in one
            place.
          </p>
        </div>
        <span>{isOwner ? "Owner workspace" : "Personal workspace"}</span>
      </section>
      <section className="settings-card settings-profile-card">
        <div className="settings-card-heading">
          <span className="settings-profile-avatar">
            {accountInitials(data.user?.name || "Workspace")}
          </span>
          <span>
            <small>Personal profile</small>
            <h2>{data.user?.name || "Your workspace"}</h2>
          </span>
          <em className={`access-pill ${isOwner ? "owner" : "member"}`}>
            {isOwner ? "Owner" : "Member"}
          </em>
        </div>
        <p>Your identity and job activity are private to this account.</p>
        <label className="settings-field">
          <span>Display name</span>
          <input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            maxLength={80}
          />
        </label>
        <div className="setting-row">
          <span>Email address</span>
          <strong>{data.user?.email || "Demo account"}</strong>
        </div>
        <div className="settings-actions">
          <button
            className="btn primary"
            disabled={
              data.mode !== "live" ||
              profileName.trim().length < 2 ||
              profileName.trim() === data.user?.name
            }
            onClick={async () => {
              try {
                await action("profile-update", undefined, {
                  name: profileName.trim(),
                });
                setToast("Profile updated.");
              } catch (cause) {
                setToast((cause as Error).message);
              }
            }}
          >
            Save profile
          </button>
          {data.mode === "live" && (
            <button className="btn" onClick={signOut}>
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </section>
      <section className="settings-card settings-preferences-card">
        <div className="settings-card-heading compact">
          <span className="settings-icon">
            <Target size={20} />
          </span>
          <span>
            <small>Matching profile</small>
            <h3>Your job preferences</h3>
          </span>
        </div>
        <p>
          These choices shape your monitors and the opportunities shown in
          Relevant.
        </p>
        <div className="preference-group">
          <span>Career stage</span>
          <div className="preference-chips">
            <i>
              {preferences.experience
                ? experienceNames[preferences.experience]
                : "Not set"}
            </i>
          </div>
        </div>
        <div className="preference-group">
          <span>Roles</span>
          <div className="preference-chips">
            {preferenceRoles.map((role) => (
              <i key={role}>{role}</i>
            ))}
          </div>
        </div>
        <div className="preference-group">
          <span>Locations</span>
          <div className="preference-chips">
            {preferenceLocations.map((location) => (
              <i key={location}>{location}</i>
            ))}
          </div>
        </div>
        <div className="preference-group">
          <span>Work style</span>
          <div className="preference-chips">
            {preferenceWorkModes.map((mode) => (
              <i key={mode}>{mode === "onsite" ? "On-site" : mode}</i>
            ))}
          </div>
        </div>
        <div className="settings-actions">
          <Link className="btn primary" href="/onboarding?edit=1">
            <Settings2 size={14} /> Update preferences
          </Link>
          <button className="btn" onClick={() => navigate("monitors")}>
            <Radio size={14} /> Manage monitors
          </button>
        </div>
      </section>
      <section className="settings-card settings-access-card">
        <div className="settings-card-heading compact">
          <span className="settings-icon">
            <Sparkles size={20} />
          </span>
          <span>
            <small>Optional feature</small>
            <h3>AI job analysis</h3>
          </span>
        </div>
        <p>
          Allow personal AI analysis of job listings against your CV. You can
          turn this off at any time.
        </p>
        <div className="setting-row">
          <span>
            <strong>Enable AI analysis</strong>
            {/* <small>{aiAnalysisEnabled ? "Enabled" : "Disabled"}</small> */}
          </span>
          <button
            type="button"
            className={`toggle ${aiAnalysisEnabled ? "on" : ""}`}
            role="switch"
            aria-checked={aiAnalysisEnabled}
            aria-label={`${aiAnalysisEnabled ? "Disable" : "Enable"} AI analysis`}
            disabled={data.mode !== "live"}
            onClick={async () => {
              const nextValue = !aiAnalysisEnabled;
              try {
                await action("profile-update", undefined, {
                  aiAnalysisEnabled: nextValue,
                });
                setToast(
                  nextValue ? "AI analysis enabled." : "AI analysis disabled.",
                );
              } catch (cause) {
                setToast((cause as Error).message);
              }
            }}
          >
            <span />
          </button>
        </div>
      </section>
      <section className="settings-card settings-access-card">
        <div className="settings-card-heading compact">
          <span className="settings-icon">
            {isOwner ? <Database size={20} /> : <ShieldCheck size={20} />}
          </span>
          <span>
            <small>
              {isOwner ? "Workspace operations" : "Private account"}
            </small>
            <h3>
              {isOwner ? "Collection controls" : "Your data stays personal"}
            </h3>
          </span>
        </div>
        <p>
          {isOwner
            ? "Owners manage shared sources and can review every collected listing. Members receive only opportunities matching their own monitors."
            : "Your saves, applications, archives, reviewed jobs, preferences, and monitors are separate from every other member."}
        </p>
        <div className="setting-row">
          <span>Opportunity access</span>
          <strong>
            {isOwner ? "All collected + relevant" : "Relevant opportunities"}
          </strong>
        </div>
        <div className="setting-row">
          <span>Source permissions</span>
          <strong>{isOwner ? "Manage and collect" : "View coverage"}</strong>
        </div>
        {isOwner && (
          <div className="settings-actions">
            <button className="btn primary" onClick={() => navigate("sources")}>
              Manage sources
            </button>
            <button className="btn" onClick={() => navigate("activity")}>
              Collection history
            </button>
          </div>
        )}
      </section>
      <section className="settings-card settings-data-card">
        <div className="settings-card-heading compact">
          <span className="settings-icon">
            <ShieldCheck size={20} />
          </span>
          <span>
            <small>Privacy and data</small>
            <h3>Yours to manage</h3>
          </span>
        </div>
        <p>
          Your saved jobs, applications, monitors, preferences, CV, and reviews
          stay with your account. An owner cannot read another member’s personal
          reviews.
        </p>
        {data.mode === "live" && (
          <a className="btn" href="/api/candidate?export=1">
            <ArrowDownToLine size={14} /> Export personal data
          </a>
        )}
      </section>
      {data.mode === "live" && isOwner && <PerformanceCostPanel />}
      {data.mode === "live" && isOwner && <AiUsageControls />}
      {data.mode === "live" && <SecurityActivity />}
    </div>
  );
}
