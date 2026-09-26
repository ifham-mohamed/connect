"use client";
import type { DashboardData, Monitor } from "@/lib/types";
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Radio,
  Target,
} from "lucide-react";
import { View } from "./shared";
import { Stat } from "./stat";

import type { Source } from "@/lib/types";

interface Props {
  relevantCount: number;
  isOwner: boolean;
  collectedCount: number;
  newCount: number;
  activeMonitors: Monitor[];
  liveSources: Source[];
  savedCount: number;
  appliedCount: number;
  navigate: (next: View, event?: React.MouseEvent<HTMLElement>) => void;
  data: DashboardData;
}
export function OverviewView({
  relevantCount,
  isOwner,
  collectedCount,
  newCount,
  activeMonitors,
  liveSources,
  savedCount,
  appliedCount,
  navigate,
  data,
}: Props) {
  return (
    <>
      <div className="stats-grid">
        <Stat
          label="Relevant opportunities"
          value={relevantCount}
          icon={<BriefcaseBusiness size={18} />}
          detail={
            isOwner
              ? `${collectedCount} total records collected`
              : `${collectedCount} personal opportunities available`
          }
          trend={`${newCount} new records today`}
        />
        <Stat
          label="Matching your interests"
          value={relevantCount}
          icon={<Target size={18} />}
          detail="Matched to your keyword monitors"
          trend="Made for your search"
        />
        <Stat
          label="Active monitors"
          value={activeMonitors.length}
          icon={<Radio size={18} />}
          detail={`${liveSources.length} sources on your radar`}
          trend="Keeping an eye out"
        />
        <Stat
          label="Saved for later"
          value={savedCount}
          icon={<Bookmark size={18} />}
          detail={`${appliedCount} applications recorded`}
          action={() => navigate("saved")}
        />
      </div>
      <div className="overview-ribbon">
        <div className="ribbon-icon">
          <Radio size={21} />
        </div>
        <div>
          <strong>Your next opportunity is out there.</strong>
          <span>
            {activeMonitors.length} focused monitors following your CV skills
            across Sri Lanka and remote roles.
          </span>
        </div>
        <div className="ribbon-status">
          <i />
          {data.mode === "demo" ? "Preview workspace" : "Sources configured"}
        </div>
        <button
          onClick={() => navigate("monitors")}
          aria-label="Manage monitors"
        >
          <ArrowRight size={19} />
        </button>
      </div>
    </>
  );
}
