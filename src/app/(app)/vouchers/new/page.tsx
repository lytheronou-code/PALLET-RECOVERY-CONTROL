import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { createVoucherAction } from "@/lib/actions/vouchers";
import { getPageContext } from "@/i18n/server";
import { VoucherForm } from "@/components/voucher-form";

export default async function NewVoucherPage() {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const [counterparties, palletTypes] = await Promise.all([
    listCounterparties(membership.organizationId),
    listPalletTypes(membership.organizationId),
  ]);

  return (
    <div className="shell" style={{ maxWidth: 880 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("vouchers.detail.eyebrow")}</div>
          <h1 className="page-title">{t("vouchers.new")}</h1>
          <div className="page-subtitle">
            {t("vouchers.form.pageSubtitle")}
          </div>
        </div>
        <Link href="/vouchers" className="btn btn-secondary">{t("common.actions.cancel")}</Link>
      </div>

      <div className="card">
        {counterparties.length === 0 || palletTypes.length === 0 ? (
          <div className="form-error">
            {t("vouchers.form.prerequisiteError")}
          </div>
        ) : null}
        <VoucherForm
          action={createVoucherAction}
          counterparties={counterparties}
          palletTypes={palletTypes}
          labels={{
            counterparty: t("vouchers.form.counterparty"),
            palletType: t("vouchers.form.palletType"),
            selectPlaceholder: t("vouchers.form.selectPlaceholder"),
            site: t("vouchers.form.site"),
            siteNone: t("vouchers.form.siteNone"),
            siteEmptyNotice: t("vouchers.form.siteEmptyNotice"),
            voucherNumber: t("vouchers.form.voucherNumber"),
            voucherNumberPlaceholder: t("vouchers.form.voucherNumberPlaceholder"),
            issueDate: t("vouchers.form.issueDate"),
            dueDate: t("vouchers.form.dueDate"),
            quantity: t("vouchers.form.quantity"),
            notes: t("vouchers.form.notes"),
            notesPlaceholder: t("vouchers.form.notesPlaceholder"),
            submit: t("vouchers.form.submit"),
            submitting: t("common.actions.creating"),
          }}
        />
      </div>
    </div>
  );
}
