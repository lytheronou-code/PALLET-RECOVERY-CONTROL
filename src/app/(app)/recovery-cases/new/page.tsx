import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { getPageContext } from "@/i18n/server";
import { RecoveryCaseForm, type RecoveryCaseFormLabels } from "@/components/recovery-case-form";

export default async function NewRecoveryCasePage({
  searchParams,
}: {
  searchParams: Promise<{
    counterpartyId?: string;
    palletTypeId?: string;
    voucherId?: string;
    quantity?: string;
  }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const params = await searchParams;
  const [counterparties, palletTypes] = await Promise.all([
    listCounterparties(membership.organizationId),
    listPalletTypes(membership.organizationId),
  ]);

  const formLabels: RecoveryCaseFormLabels = {
    counterparty: t("recoveryCases.form.counterparty"),
    selectPlaceholder: t("recoveryCases.form.selectPlaceholder"),
    palletType: t("recoveryCases.form.palletType"),
    site: t("recoveryCases.form.site"),
    noSite: t("recoveryCases.form.noSite"),
    noSitesForCounterparty: t("recoveryCases.form.noSitesForCounterparty"),
    quantityClaimed: t("recoveryCases.form.quantityClaimed"),
    dueDate: t("recoveryCases.form.dueDate"),
    priority: t("recoveryCases.form.priority"),
    priorityOptions: {
      low: t("common.status.priority.low"),
      normal: t("common.status.priority.normal"),
      high: t("common.status.priority.high"),
      critical: t("common.status.priority.critical"),
    },
    notes: t("recoveryCases.form.notes"),
    creating: t("recoveryCases.form.creating"),
    create: t("recoveryCases.form.create"),
  };

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">{t("recoveryCases.newPageTitle")}</div>
      </div>
      <div className="card">
        <RecoveryCaseForm
          counterparties={counterparties.map((c) => ({ id: c.id, legalName: c.legal_name }))}
          palletTypes={palletTypes.map((p) => ({ id: p.id, code: p.code }))}
          defaults={{
            counterpartyId: params.counterpartyId,
            palletTypeId: params.palletTypeId,
            voucherId: params.voucherId,
            quantityClaimed: params.quantity ? Number(params.quantity) : undefined,
          }}
          labels={formLabels}
        />
      </div>
    </div>
  );
}
