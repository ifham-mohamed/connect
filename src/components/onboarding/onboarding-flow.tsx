"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceLevel, Monitor, UserPreferences, WorkMode } from "@/lib/types";
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
type MonitorDraft = {
  clientId: string;
  name: string;
  keywords: string[];
  excludedKeywords: string[];
  location: string;
  remoteOnly: boolean;
  workModes: WorkMode[];
  enabled: boolean;
};

const experiences: { id: Experience; label: string; detail: string }[] = [
  {
    id: "internship",
    label: "Internship",
    detail: "Internships, trainee, apprentice, and placement roles",
  },
  {
    id: "entry",
    label: "Entry level",
    detail: "Junior, associate, graduate, and level-one roles",
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

const locationOptions = ["Sri Lanka", "Qatar", "United Arab Emirates", "Saudi Arabia", "Singapore", "United Kingdom", "United States", "Canada", "Australia", "Germany", "Worldwide"];
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
  if (experience === "internship")
    return [
      `${value} intern`,
      `intern ${value}`,
      `trainee ${value}`,
      `apprentice ${value}`,
    ];
  if (experience === "entry")
    return [
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

const sriLankaLocations = new Set(["colombo", "western province", "kandy", "galle", "jaffna", "gampaha", "negombo", "matara", "kurunegala"]);
function monitorLocations(locations: string[]) {
  const coversSriLanka = locations.includes("Sri Lanka");
  return locations.filter((location, index) => locations.indexOf(location) === index && (!coversSriLanka || !sriLankaLocations.has(location.toLowerCase())));
}

function makeMonitors(
  roles: string[],
  experience: Experience,
  locations: string[],
  locationModes: Record<string, WorkMode[]>,
): MonitorDraft[] {
  const targets = monitorLocations(locations);
  return roles.flatMap((role) => {
    const preset = rolePresets.find((item) => item.label === role);
    return targets.map((location) => {
      const workModes = location === "Worldwide" ? ["remote" as const] : locationModes[location] || ["onsite", "hybrid", "remote"];
      return ({
      clientId: `generated-${role}-${location}`,
      name: `${role} · ${location}`,
      keywords: [...new Set([...(preset?.keywords || [role.toLowerCase()]), ...experienceKeywords(role, experience)])],
      excludedKeywords: exclusionsFor(experience),
      location: location === "Worldwide" ? "" : location,
      remoteOnly: workModes.length === 1 && workModes[0] === "remote",
      workModes,
      enabled: true,
      });
    });
  });
}

export function OnboardingFlow({
  userName,
  userRole,
  editMode = false,
  initialPreferences = {},
  initialMonitors = [],
}: {
  userName: string;
  userRole: "owner" | "member";
  editMode?: boolean;
  initialPreferences?: UserPreferences;
  initialMonitors?: Monitor[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<Experience | "">(initialPreferences.experience || "");
  const [roles, setRoles] = useState<string[]>(initialPreferences.roles || []);
  const [locations, setLocations] = useState<string[]>(initialPreferences.locations || []);
  const [locationModes, setLocationModes] = useState<Record<string, WorkMode[]>>(() =>
    Object.fromEntries((initialPreferences.locations || []).map((location) => [location, location === "Worldwide" ? ["remote"] : initialPreferences.locationWorkModes?.find((item) => item.location === location)?.workModes || initialPreferences.workModes || ["onsite", "hybrid", "remote"]])),
  );
  const [monitors, setMonitors] = useState<MonitorDraft[]>(
    initialMonitors.map((monitor) => ({
      clientId: monitor.id,
      name: monitor.name,
      keywords: monitor.keywords,
      excludedKeywords: monitor.excludedKeywords,
      location: monitor.location,
      remoteOnly: monitor.remoteOnly,
      workModes: monitor.workModes || (monitor.remoteOnly ? ["remote"] : ["onsite", "hybrid", "remote"]),
      enabled: monitor.enabled,
    })),
  );
  const [customName, setCustomName] = useState("");
  const [customKeywords, setCustomKeywords] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(experience);
    if (step === 1) return roles.length > 0;
    if (step === 2) return locations.length > 0 && locations.every((location) => (locationModes[location] || []).length > 0);
    return monitors.length > 0;
  }, [experience, locationModes, locations, monitors.length, roles.length, step]);

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
      setMonitors(makeMonitors(roles, experience, locations, locationModes));
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
    if (userRole !== "owner" && monitors.length >= 24) {
      setError("You can keep up to 24 personal monitors.");
      return;
    }
    setMonitors((current) => [
      {
        clientId: `custom-${crypto.randomUUID()}`,
        name: customName.trim(),
        keywords: keywords.slice(0, 20),
        excludedKeywords: experience ? exclusionsFor(experience) : [],
        location: locations[0] === "Worldwide" ? "" : locations[0] || "",
        remoteOnly: (locationModes[locations[0]] || []).length === 1 && locationModes[locations[0]]?.[0] === "remote",
        workModes: locationModes[locations[0]] || ["onsite", "hybrid", "remote"],
        enabled: true,
      },
      ...current,
    ]);
    setCustomName("");
    setCustomKeywords("");
    setError("");
  }

  function addLocation() {
    const value = customLocation.trim().replace(/\s+/g, " ");
    if (!value || locations.some((location) => location.toLowerCase() === value.toLowerCase())) return;
    if (userRole !== "owner" && locations.length >= 6) {
      setError("Workspace members can select up to six locations.");
      return;
    }
    setLocations((current) => [...current, value]);
    setLocationModes((current) => ({ ...current, [value]: value === "Worldwide" ? ["remote"] : ["onsite", "hybrid", "remote"] }));
    setCustomLocation("");
    setError("");
  }

  function toggleLocation(location: string) {
    if (locations.includes(location)) {
      setLocations((current) => current.filter((item) => item !== location));
      setLocationModes((current) => { const next = { ...current }; delete next[location]; return next; });
      return;
    }
    if (userRole !== "owner" && locations.length >= 6) return;
    setLocations((current) => [...current, location]);
    setLocationModes((current) => ({ ...current, [location]: location === "Worldwide" ? ["remote"] : ["onsite", "hybrid", "remote"] }));
  }

  function toggleLocationMode(location: string, mode: WorkMode) {
    if (location === "Worldwide") return;
    setLocationModes((current) => ({ ...current, [location]: toggle(current[location] || [], mode) }));
  }

  async function finish() {
    if (!experience || !canContinue) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience,
          roles,
          locations,
          workModes: [...new Set(locations.flatMap((location) => locationModes[location] || []))],
          locationWorkModes: locations.map((location) => ({ location, workModes: locationModes[location] || [] })),
          monitors,
        }),
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
              <p className="onboarding-selection-note">Select up to four roles. Each role becomes a focused monitor for every country you choose.</p>
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
                <legend><MapPin size={16} /> Preferred countries <small>{userRole === "owner" ? "Add every country you need" : "Select up to six"}</small></legend>
                <div className="onboarding-chips">
                  {[...new Set([...locationOptions, ...locations])].map((location) => <button type="button" className={locations.includes(location) ? "selected" : ""} onClick={() => toggleLocation(location)} key={location}>{locations.includes(location) && <Check size={13} />}{location}</button>)}
                </div>
                <div className="onboarding-location-entry"><input aria-label="Add another country" placeholder="Add another country" value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLocation(); } }} /><button className="btn" type="button" onClick={addLocation}><Plus size={14} /> Add country</button></div>
                {locations.includes("Sri Lanka") && <p className="onboarding-coverage-note"><Check size={13} /> Sri Lanka includes Colombo, Western Province, Kandy, Galle, Jaffna, Gampaha, Negombo, Matara, Kurunegala, and other provinces and districts.</p>}
              </fieldset>
              <fieldset>
                <legend><BriefcaseBusiness size={16} /> Work arrangement <small>Choose modes for each country</small></legend>
                <div className="onboarding-location-modes">
                  {locations.map((location) => <div className="onboarding-location-mode" key={location}><strong>{location}</strong><div className="onboarding-chips">{workModeOptions.map((mode) => { const selected = (locationModes[location] || []).includes(mode.id); const unavailable = location === "Worldwide" && mode.id !== "remote"; return <button type="button" className={selected ? "selected" : ""} disabled={unavailable} onClick={() => toggleLocationMode(location, mode.id)} key={mode.id}>{selected && <Check size={13} />}{mode.label}</button>; })}</div></div>)}
                </div>
              </fieldset>
              <div className="onboarding-why"><Sparkles size={16} /><span><strong>Why we ask</strong><small>A country automatically covers its recognized cities and regions, so one Sri Lanka monitor can match Colombo, Western Province, Kandy, Jaffna, and other local listings. Choosing only Remote creates remote-only monitors.</small></span></div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-review">
              <div className="onboarding-list-panel">
                <div className="onboarding-list-heading">
                  <strong>Your monitors</strong>
                  <span>{monitors.length}{userRole === "owner" ? "" : " of 24"} · four visible at a time</span>
                </div>
                <div className="onboarding-monitor-list" aria-live="polite">
                  {monitors.map((monitor) => (
                    <article key={monitor.clientId}>
                      <span className="monitor-icon"><Radio size={17} /></span>
                      <div><strong>{monitor.name}</strong><small>{monitor.keywords.slice(0, 4).join(" · ")}</small><em>{monitor.location || "Any location"} · {monitor.workModes.map((mode) => mode === "onsite" ? "On-site" : mode[0].toUpperCase() + mode.slice(1)).join(" / ")}</em></div>
                      <button aria-label={`Remove ${monitor.name}`} onClick={() => setMonitors((current) => current.filter((item) => item.clientId !== monitor.clientId))}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              </div>
              <div className="onboarding-custom">
                <div><strong>Add another monitor</strong><small>Use a name and comma-separated role or skill keywords.</small></div>
                <input aria-label="Custom monitor name" placeholder="e.g. TypeScript roles" value={customName} onChange={(event) => setCustomName(event.target.value)} />
                <input aria-label="Custom monitor keywords" placeholder="typescript developer, typescript engineer" value={customKeywords} onChange={(event) => setCustomKeywords(event.target.value)} />
                <button className="btn" type="button" disabled={userRole !== "owner" && monitors.length >= 24} onClick={addCustomMonitor}>
                  <Plus size={15} /> {userRole !== "owner" && monitors.length >= 24 ? "Monitor limit reached" : "Add monitor"}
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
