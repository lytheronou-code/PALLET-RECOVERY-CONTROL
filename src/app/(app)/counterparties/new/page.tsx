import { CounterpartyForm } from "@/components/counterparty-form";
import { createCounterpartyAction } from "@/lib/actions/counterparties";
import { requireMembership } from "@/lib/data/organization";
import { getPageContext } from "@/i18n/server";

export default async function NewCounterpartyPage() {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">{t("counterparties.new")}</div>
      </div>
      <div className="card">
        <CounterpartyForm
          action={createCounterpartyAction}
          labels={{
            legalName: t("counterparties.table.legalName"),
            tradingName: t("counterparties.fields.tradingName"),
            code: t("counterparties.table.code"),
            vatNumber: t("counterparties.fields.vatId"),
            taxId: t("counterparties.fields.taxId"),
            registrationNumber: t("counterparties.fields.registrationNumber"),
            type: t("counterparties.table.type"),
            typeLabels: {
              customer: t("counterparties.types.customer"),
              debtor: t("counterparties.types.debtor"),
              retailer: t("counterparties.types.retailer"),
              carrier: t("counterparties.types.carrier"),
              supplier: t("counterparties.types.supplier"),
              other: t("counterparties.types.other"),
            },
            addressLine: t("counterparties.fields.addressLine1"),
            addressLine2: t("counterparties.fields.addressLine2"),
            postalCode: t("counterparties.fields.postalCode"),
            city: t("counterparties.fields.city"),
            region: t("counterparties.fields.region"),
            email: t("counterparties.fields.email"),
            phone: t("counterparties.fields.phone"),
            countryCode: t("counterparties.fields.countryCode"),
            saving: t("common.actions.saving"),
            createSubmit: t("counterparties.new"),
            saveSubmit: t("common.actions.saveChanges"),
          }}
        />
      </div>
    </div>
  );
}
