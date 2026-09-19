"use client";

import { useState, useTransition } from "react";
import { applyPalletTypePresetAction, PALLET_TYPE_PRESETS } from "@/lib/actions/onboarding-setup";

export function OnboardingPalletPresets({
  existingCount,
  labels,
}: {
  existingCount: number;
  labels: { usePreset: string; skip: string; configuredSingular: string; configuredPlural: string };
}) {
  const [applied, setApplied] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function handleApply(code: string) {
    startTransition(async () => {
      const result = await applyPalletTypePresetAction(code);
      if (!result.error) {
        setApplied((prev) => [...prev, code]);
      }
    });
  }

  const configuredTemplate = existingCount === 1 ? labels.configuredSingular : labels.configuredPlural;

  return (
    <div>
      {existingCount > 0 ? (
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          {configuredTemplate.replace("{count}", String(existingCount))}
        </p>
      ) : null}
      <div className="quick-start">
        {PALLET_TYPE_PRESETS.map((preset) => (
          <button
            key={preset.code}
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pending || applied.includes(preset.code)}
            onClick={() => handleApply(preset.code)}
            style={{ justifyContent: "flex-start" }}
          >
            {applied.includes(preset.code) ? "✓ " : ""}
            {preset.description}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>{labels.skip}</p>
    </div>
  );
}
