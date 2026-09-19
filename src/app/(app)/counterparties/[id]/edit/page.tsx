import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getCounterparty } from "@/lib/data/counterparties";
import { CounterpartyForm } from "@/components/counterparty-form";
import { updateCounterpartyAction } from "@/lib/actions/counterparties";
import { getPageContext } from "@/i18n/server";

export default async function EditCounterpartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t, locale } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const counterparty = await getCounterparty(membership.organizationId, id);

  if (!counterparty) {
    notFound();
  }

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">{t("counterparties.editTitle")}</div>
      </div>
      <div className="card">
        <CounterpartyForm
          action={updateCounterpartyAction.bind(null, id)}
          counterparty={counterparty}
          locale={locale}
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
