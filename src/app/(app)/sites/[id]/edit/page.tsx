import { notFound } from "next/navigation";
import { SiteForm } from "@/components/site-form";
import { updateSiteAction } from "@/lib/actions/sites";
import { requireMembership } from "@/lib/data/organization";
import { getSite } from "@/lib/data/sites";
import { listCounterparties } from "@/lib/data/counterparties";
import { getPageContext } from "@/i18n/server";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const [site, counterparties] = await Promise.all([
    getSite(membership.organizationId, id),
    listCounterparties(membership.organizationId, { includeInactive: true }),
  ]);

  if (!site) notFound();

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("sites.eyebrow")}</div>
          <h1 className="page-title">{site.name}</h1>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <SiteForm
            action={updateSiteAction.bind(null, site.id)}
            site={site}
            counterparties={counterparties}
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
