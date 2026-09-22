"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceLevel, Monitor, UserPreferences } from "@/lib/types";
import { experienceExclusions } from "@/lib/matching";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  LoaderCircle,
  MapPin,
  Plus,
  Radio,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

type Experience = ExperienceLevel;
type WorkMode = "onsite" | "hybrid" | "remote";
type MonitorDraft = {
  clientId: string;
  name: string;
  keywords: string[];
  excludedKeywords: string[];
  location: string;
  remoteOnly: boolean;
  enabled: boolean;
};

const experiences: { id: Experience; label: string; detail: string }[] = [
  {
    id: "early",
    label: "Internship / Entry",
    detail: "Internships, trainee, junior, associate, and graduate roles",
  },
  {
    id: "mid",
    label: "Mid level",
    detail: "Independent contributor roles without senior leadership",
  },
  {
    id: "senior",
    label: "Senior",
    detail: "Senior, lead, and staff-level opportunities",
  },
  {
    id: "other",
    label: "Other / unspecified",
    detail: "Roles whose titles do not state a career level",
  },
];

const rolePresets = [
  { label: "Software Engineer", keywords: ["software engineer", "application engineer", "product engineer"] },
  { label: "Full Stack Developer", keywords: ["full stack developer", "full stack engineer", "mern stack developer"] },
  { label: "Frontend Developer", keywords: ["frontend developer", "frontend engineer", "react developer", "next.js developer"] },
  { label: "Backend Developer", keywords: ["backend developer", "backend engineer", "node developer", "api developer"] },
  { label: "Mobile Developer", keywords: ["mobile developer", "react native developer", "flutter developer", "android developer"] },
  { label: "QA Engineer", keywords: ["qa engineer", "quality assurance engineer", "software test engineer", "automation engineer"] },
  { label: "DevOps Engineer", keywords: ["devops engineer", "cloud engineer", "site reliability engineer", "platform engineer"] },
  { label: "Data / AI", keywords: ["data engineer", "data analyst", "machine learning engineer", "ai engineer"] },
];

const locationOptions = ["Sri Lanka", "Colombo", "Western Province", "Qatar", "Worldwide"];
const workModeOptions: { id: WorkMode; label: string }[] = [
  { id: "onsite", label: "On-site" },
  { id: "hybrid", label: "Hybrid" },
  { id: "remote", label: "Remote" },
];

const stepDetails = [
  { label: "Career stage", why: "Sets the seniority language to include and exclude." },
  { label: "Roles", why: "Creates focused keyword monitors around work you want." },
  { label: "Location", why: "Keeps results within places and work modes you can accept." },
  { label: "Your monitors", why: "Lets you review, remove, or add searches before saving." },
];

function exclusionsFor(experience: Experience) {
  return experienceExclusions(experience);
}

function experienceKeywords(role: string, experience: Experience) {
  const value = role.toLowerCase();
  if (experience === "early")
    return [
      `${value} intern`,
      `intern ${value}`,
      `trainee ${value}`,
      `junior ${value}`,
      `associate ${value}`,
      `graduate ${value}`,
      `entry level ${value}`,
    ];
  if (experience === "mid")
    return [`mid level ${value}`, `intermediate ${value}`];
  if (experience === "senior") return [`senior ${value}`, `lead ${value}`];
  return [];
}

function makeMonitors(
  roles: string[],
  experience: Experience,
  locations: string[],
  workModes: WorkMode[],
): MonitorDraft[] {
  return roles.flatMap((role) => {
    const preset = rolePresets.find((item) => item.label === role);
    return locations.map((location) => ({
      clientId: `generated-${role}-${location}`,
      name: `${role} · ${location}`,
      keywords: [...new Set([...(preset?.keywords || [role.toLowerCase()]), ...experienceKeywords(role, experience)])],
      excludedKeywords: exclusionsFor(experience),
      location: location === "Worldwide" ? "" : location,
      remoteOnly: workModes.length === 1 && workModes[0] === "remote",
      enabled: true,
    }));
  });
}

export function OnboardingFlow({
  userName,
  editMode = false,
  initialPreferences = {},
  initialMonitors = [],
}: {
  userName: string;
  editMode?: boolean;
  initialPreferences?: UserPreferences;
  initialMonitors?: Monitor[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<Experience | "">(initialPreferences.experience || "");
  const [roles, setRoles] = useState<string[]>(initialPreferences.roles || []);
  const [locations, setLocations] = useState<string[]>(initialPreferences.locations || []);
  const [workModes, setWorkModes] = useState<WorkMode[]>(initialPreferences.workModes || ["hybrid", "remote"]);
  const [monitors, setMonitors] = useState<MonitorDraft[]>(
    initialMonitors.map((monitor) => ({
      clientId: monitor.id,
      name: monitor.name,
      keywords: monitor.keywords,
      excludedKeywords: monitor.excludedKeywords,
      location: monitor.location,
      remoteOnly: monitor.remoteOnly,
      enabled: monitor.enabled,
    })),
  );
  const [customName, setCustomName] = useState("");
  const [customKeywords, setCustomKeywords] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(experience);
    if (step === 1) return roles.length > 0;
    if (step === 2) return locations.length > 0 && workModes.length > 0;
    return monitors.length > 0;
  }, [experience, locations.length, monitors.length, roles.length, step, workModes.length]);

  function toggle<T>(items: T[], value: T, maximum = Infinity) {
    return items.includes(value)
      ? items.filter((item) => item !== value)
      : items.length < maximum
        ? [...items, value]
        : items;
  }

  function continueFlow() {
    if (!canContinue) return;
    if (step === 2 && experience) {
      setMonitors(makeMonitors(roles, experience, locations, workModes));
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  function addCustomMonitor() {
    const keywords = customKeywords.split(",").map((value) => value.trim()).filter(Boolean);
    if (!customName.trim() || !keywords.length) {
      setError("Give the monitor a name and at least one comma-separated keyword.");
      return;
    }
    if (monitors.length >= 12) {
      setError("You can start with up to 12 monitors. Remove one before adding another.");
      return;
    }
    setMonitors((current) => [
      {
        clientId: `custom-${crypto.randomUUID()}`,
        name: customName.trim(),
        keywords: keywords.slice(0, 20),
        excludedKeywords: experience ? exclusionsFor(experience) : [],
        location: locations[0] === "Worldwide" ? "" : locations[0] || "",
        remoteOnly: workModes.length === 1 && workModes[0] === "remote",
        enabled: true,
      },
      ...current,
    ]);
    setCustomName("");
    setCustomKeywords("");
    setError("");
  }

  async function finish() {
    if (!experience || !canContinue) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience, roles, locations, workModes, monitors }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your preferences.");
      router.replace(editMode ? "/app/settings" : "/app/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your preferences.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <aside className="onboarding-aside">
        <div className="brand onboarding-brand"><span className="brand-icon"><Radio size={22} /></span>jobradar<span className="brand-dot">.</span></div>
        <div className="onboarding-aside-copy">
          <span className="onboarding-kicker"><Sparkles size={14} /> {editMode ? "Preference profile" : "Personal setup"}</span>
          <h1>{editMode ? "Keep your search aligned." : "Make every search feel like yours."}</h1>
          <p>We ask only for the preferences needed to build your monitors. You can edit, pause, add, or delete them later.</p>
        </div>
        <ol className="onboarding-progress">
          {stepDetails.map((item, index) => (
            <li className={index === step ? "active" : index < step ? "done" : ""} key={item.label}>
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              <div><strong>{item.label}</strong><small>{item.why}</small></div>
            </li>
          ))}
        </ol>
      </aside>

      <section className="onboarding-main">
        <div className="onboarding-card">
          <header>
            <span>Step {step + 1} of 4</span>
            <h2>
              {step === 0 && `Welcome, ${userName.split(" ")[0]}. Where are you in your career?`}
              {step === 1 && "Which roles should Jobradar watch?"}
              {step === 2 && "Where and how do you want to work?"}
              {step === 3 && "Review your personal monitors."}
            </h2>
            <p>{stepDetails[step].why}</p>
          </header>

          {step === 0 && (
            <div className="onboarding-options single">
              {experiences.map((item) => (
                <button className={experience === item.id ? "selected" : ""} onClick={() => setExperience(item.id)} key={item.id}>
                  <BriefcaseBusiness size={18} /><span><strong>{item.label}</strong><small>{item.detail}</small></span>{experience === item.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <p className="onboarding-selection-note">Select up to four roles. Each role becomes a monitor for every location you choose.</p>
              <div className="onboarding-options roles">
                {rolePresets.map((item) => (
                  <button className={roles.includes(item.label) ? "selected" : ""} onClick={() => setRoles((current) => toggle(current, item.label, 4))} key={item.label}>
                    <Target size={17} /><span><strong>{item.label}</strong><small>{item.keywords.slice(0, 2).join(" · ")}</small></span>{roles.includes(item.label) && <Check size={16} />}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="onboarding-preferences">
              <fieldset>
                <legend><MapPin size={16} /> Preferred locations <small>Select up to three</small></legend>
                <div className="onboarding-chips">
                  {locationOptions.map((location) => <button type="button" className={locations.includes(location) ? "selected" : ""} onClick={() => setLocations((current) => toggle(current, location, 3))} key={location}>{locations.includes(location) && <Check size={13} />}{location}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend><BriefcaseBusiness size={16} /> Work arrangement <small>Select every arrangement you would accept</small></legend>
                <div className="onboarding-chips">
                  {workModeOptions.map((mode) => <button type="button" className={workModes.includes(mode.id) ? "selected" : ""} onClick={() => setWorkModes((current) => toggle(current, mode.id))} key={mode.id}>{workModes.includes(mode.id) && <Check size={13} />}{mode.label}</button>)}
                </div>
              </fieldset>
              <div className="onboarding-why"><Sparkles size={16} /><span><strong>Why we ask</strong><small>Location limits collected-job matches. Choosing only Remote creates remote-only monitors; mixed choices keep remote and local roles visible.</small></span></div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-review">
              <div className="onboarding-list-panel">
                <div className="onboarding-list-heading">
                  <strong>Your monitors</strong>
                  <span>{monitors.length} of 12 · four visible at a time</span>
                </div>
                <div className="onboarding-monitor-list" aria-live="polite">
                  {monitors.map((monitor) => (
                    <article key={monitor.clientId}>
                      <span className="monitor-icon"><Radio size={17} /></span>
                      <div><strong>{monitor.name}</strong><small>{monitor.keywords.slice(0, 4).join(" · ")}</small><em>{monitor.remoteOnly ? "Remote only" : monitor.location || "Any location"}</em></div>
                      <button aria-label={`Remove ${monitor.name}`} onClick={() => setMonitors((current) => current.filter((item) => item.clientId !== monitor.clientId))}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              </div>
              <div className="onboarding-custom">
                <div><strong>Add another monitor</strong><small>Use a name and comma-separated role or skill keywords.</small></div>
                <input aria-label="Custom monitor name" placeholder="e.g. TypeScript roles" value={customName} onChange={(event) => setCustomName(event.target.value)} />
                <input aria-label="Custom monitor keywords" placeholder="typescript developer, typescript engineer" value={customKeywords} onChange={(event) => setCustomKeywords(event.target.value)} />
                <button className="btn" type="button" disabled={monitors.length >= 12} onClick={addCustomMonitor}>
                  <Plus size={15} /> {monitors.length >= 12 ? "Monitor limit reached" : "Add monitor"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="inline-error onboarding-error" role="alert">{error}</p>}
          <footer>
            <button className="btn" disabled={step === 0 || busy} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={15} /> Back</button>
            {step < 3 ? (
              <button className="btn primary" disabled={!canContinue} onClick={continueFlow}>Continue <ArrowRight size={15} /></button>
            ) : (
              <button className="btn primary" disabled={!canContinue || busy} onClick={finish}>{busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} {editMode ? "Save preferences" : "Build my workspace"} <ArrowRight size={15} /></button>
            )}
          </footer>
        </div>
      </section>
    </main>
  );
}
