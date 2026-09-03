import { useState } from "react";
import { MechanicalTapeLoomDemo } from "~/components/MechanicalTapeLoomDemo";
import { OrbitalDriftRadarDemo } from "~/components/OrbitalDriftRadarDemo";
import { SplitFlapMatrixDemo } from "~/components/SplitFlapMatrixDemo";

export function ReconciliationVisualShowcase() {
  const [activeTab, setActiveTab] = useState<"tape" | "radar" | "matrix">(
    "tape",
  );

  return (
    <div className="reconciliation-showcase-wrapper">
      <div className="showcase-tab-bar">
        <span className="showcase-tab-label">Visual Metaphor:</span>
        <button
          type="button"
          className={`showcase-tab-btn ${activeTab === "tape" ? "active" : ""}`}
          onClick={() => setActiveTab("tape")}
        >
          <span className="tab-num">1</span>
          <span className="tab-title">Dual Tape &amp; Repair Loom</span>
        </button>
        <button
          type="button"
          className={`showcase-tab-btn ${activeTab === "radar" ? "active" : ""}`}
          onClick={() => setActiveTab("radar")}
        >
          <span className="tab-num">2</span>
          <span className="tab-title">Orbital Drift Radar</span>
        </button>
        <button
          type="button"
          className={`showcase-tab-btn ${activeTab === "matrix" ? "active" : ""}`}
          onClick={() => setActiveTab("matrix")}
        >
          <span className="tab-num">3</span>
          <span className="tab-title">Split-Flap Matrix</span>
        </button>
      </div>

      <div className="showcase-active-view">
        {activeTab === "tape" && <MechanicalTapeLoomDemo />}
        {activeTab === "radar" && <OrbitalDriftRadarDemo />}
        {activeTab === "matrix" && <SplitFlapMatrixDemo />}
      </div>
    </div>
  );
}
