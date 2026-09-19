import { SiteForm } from "@/components/site-form";
import { createSiteAction } from "@/lib/actions/sites";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { getPageContext } from "@/i18n/server";

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ counterpartyId?: string }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const { counterpartyId } = await searchParams;
  const counterparties = await listCounterparties(membership.organizationId);

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("sites.eyebrow")}</div>
          <h1 className="page-title">{t("sites.new")}</h1>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <SiteForm
            action={createSiteAction}
            counterparties={counterparties}
            defaultCounterpartyId={counterpartyId}
            labels={{
              name: t("sites.fields.name"),
              code: t("sites.table.code"),
              linkedCounterparty: t("sites.fields.linkedCounterparty"),
              noCounterpartyOption: t("sites.fields.noCounterpartyOption"),
              addressLine: t("sites.fields.addressLine1"),
              addressLine2: t("sites.fields.addressLine2"),
              postalCode: t("sites.fields.postalCode"),
              city: t("sites.fields.city"),
              region: t("sites.fields.region"),
              countryCode: t("sites.fields.countryCode"),
              saving: t("common.actions.saving"),
              createSubmit: t("sites.new"),
              saveSubmit: t("common.actions.saveChanges"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
