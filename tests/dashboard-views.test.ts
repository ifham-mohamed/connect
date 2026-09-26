import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { demoData } from "../src/lib/demo";

// Assert whether private widgets are mounted without calling their live APIs.
vi.mock("next/dynamic", () => ({
  default: () => () => createElement("span", { "data-private-widget": true }),
}));
const { JobDetail } = await import("../src/components/dashboard/job-detail");
const { SettingsView } =
  await import("../src/components/dashboard/settings-view");
const { OverviewView } =
  await import("../src/components/dashboard/overview-view");
const { MonitorForm } =
  await import("../src/components/dashboard/monitor-form");

describe("extracted dashboard presentation", () => {
  it("keeps private review/image widgets and notes out of demo job details", () => {
    const props = {
      job: {
        ...demoData().jobs[0],
        sourceImageUrl: "https://example.com/advert.png",
        applicationNote: "Follow up tomorrow",
      },
      loading: false,
      owner: false,
      localSkillMatches: [],
      matchedMonitorNames: [],
      onStatus: vi.fn(),
      onNote: vi.fn(),
    };
    const demo = renderToStaticMarkup(
      createElement(JobDetail, { ...props, demo: true }),
    );
    expect(demo).toContain("Illustrative sample");
    expect(demo).not.toContain("data-private-widget");
    expect(demo).not.toContain("Follow up tomorrow");
    const live = renderToStaticMarkup(
      createElement(JobDetail, { ...props, demo: false }),
    );
    expect(live.match(/data-private-widget/g)).toHaveLength(2);
    expect(live).toContain("Private application note");
    expect(live).toContain("Follow up tomorrow");
    const loading = renderToStaticMarkup(
      createElement(JobDetail, { ...props, demo: false, loading: true }),
    );
    expect(loading).toContain("Loading opportunity details");
  });
  it("retains distinct owner and member settings", () => {
    const props = {
      data: demoData(),
      profileName: "Applicant",
      setProfileName: vi.fn(),
      action: vi.fn(),
      setToast: vi.fn(),
      signOut: vi.fn(),
      preferences: {},
      preferenceRoles: [],
      preferenceLocations: [],
      preferenceWorkModes: [],
      navigate: vi.fn(),
    };
    const owner = renderToStaticMarkup(
      createElement(SettingsView, { ...props, isOwner: true }),
    );
    const member = renderToStaticMarkup(
      createElement(SettingsView, { ...props, isOwner: false }),
    );
    expect(owner).toContain("Manage sources");
    expect(member).not.toContain("Manage sources");
    expect(member).toContain("Personal workspace");
  });
  it("renders account-scoped overview counts and existing form defaults", () => {
    const data = demoData();
    const html = renderToStaticMarkup(
      createElement(OverviewView, {
        data,
        isOwner: false,
        collectedCount: 12,
        relevantCount: 7,
        newCount: 2,
        savedCount: 3,
        appliedCount: 1,
        activeMonitors: data.monitors,
        liveSources: data.sources,
        navigate: vi.fn(),
      }),
    );
    expect(html).toContain("12 personal opportunities available");
    expect(html).not.toContain("total records collected");
    const form = renderToStaticMarkup(
      createElement(MonitorForm, {
        monitor: data.monitors[0],
        onSave: vi.fn(),
      }),
    );
    expect(form).toContain(data.monitors[0].name);
    expect(form).toContain("required");
    expect(form).toContain("Work arrangements");
  });
});
