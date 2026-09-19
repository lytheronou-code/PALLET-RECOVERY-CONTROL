"use client";

import { useActionState } from "react";
import { updateBrandingAction, uploadBrandingLogoAction } from "@/lib/actions/branding";
import { emptyFormState } from "@/lib/actions/form-state";
import type { Tables } from "@/lib/supabase/database.types";

export type OrganizationBrandingLabels = {
  portalName: string;
  logo: string;
  compactLogo: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  welcomeMessageIt: string;
  welcomeMessageEn: string;
  save: string;
  saving: string;
  uploadLogo: string;
  uploading: string;
};

function LogoUploadForm({
  kind,
  currentUrl,
  label,
  uploadLabel,
  uploadingLabel,
}: {
  kind: "logo" | "compact_logo";
  currentUrl: string | null;
  label: string;
  uploadLabel: string;
  uploadingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(uploadBrandingLogoAction.bind(null, kind), emptyFormState);

  return (
    <div className="field">
      <label>{label}</label>
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt={label} style={{ height: 40, marginBottom: 8, display: "block" }} />
      ) : null}
      <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {state.error ? <div className="form-error">{state.error}</div> : null}
        <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
          {pending ? uploadingLabel : uploadLabel}
        </button>
      </form>
    </div>
  );
}

export function OrganizationBrandingForm({
  branding,
  logoUrl,
  compactLogoUrl,
  labels,
}: {
  branding: Tables<"organization_branding"> | null;
  logoUrl: string | null;
  compactLogoUrl: string | null;
  labels: OrganizationBrandingLabels;
}) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, emptyFormState);

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <LogoUploadForm
          kind="logo"
          currentUrl={logoUrl}
          label={labels.logo}
          uploadLabel={labels.uploadLogo}
          uploadingLabel={labels.uploading}
        />
        <LogoUploadForm
          kind="compact_logo"
          currentUrl={compactLogoUrl}
          label={labels.compactLogo}
          uploadLabel={labels.uploadLogo}
          uploadingLabel={labels.uploading}
        />
      </div>

      <form action={formAction}>
        {state.error ? <div className="form-error">{state.error}</div> : null}
        {state.message ? <div className="form-message">{state.message}</div> : null}

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="field">
            <label htmlFor="portalName">{labels.portalName}</label>
            <input id="portalName" name="portalName" type="text" defaultValue={branding?.portal_name ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="primaryColor">{labels.primaryColor}</label>
            <input
              id="primaryColor"
              name="primaryColor"
              type="text"
              placeholder="#0F766E"
              defaultValue={branding?.primary_color ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="secondaryColor">{labels.secondaryColor}</label>
            <input
              id="secondaryColor"
              name="secondaryColor"
              type="text"
              placeholder="#0F172A"
              defaultValue={branding?.secondary_color ?? ""}
            />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="field">
            <label htmlFor="supportEmail">{labels.supportEmail}</label>
            <input id="supportEmail" name="supportEmail" type="email" defaultValue={branding?.support_email ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="supportPhone">{labels.supportPhone}</label>
            <input id="supportPhone" name="supportPhone" type="text" defaultValue={branding?.support_phone ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="website">{labels.website}</label>
            <input id="website" name="website" type="text" defaultValue={branding?.website ?? ""} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label htmlFor="welcomeMessageIt">{labels.welcomeMessageIt}</label>
            <textarea id="welcomeMessageIt" name="welcomeMessageIt" rows={2} defaultValue={branding?.welcome_message_it ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="welcomeMessageEn">{labels.welcomeMessageEn}</label>
            <textarea id="welcomeMessageEn" name="welcomeMessageEn" rows={2} defaultValue={branding?.welcome_message_en ?? ""} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-sm" disabled={pending} style={{ width: "auto" }}>
          {pending ? labels.saving : labels.save}
        </button>
      </form>
    </div>
  );
}
