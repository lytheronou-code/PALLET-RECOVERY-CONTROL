import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getVoucherDetail } from "@/lib/data/vouchers";
import { updateVoucherAction } from "@/lib/actions/vouchers";
import { getPageContext } from "@/i18n/server";
import { VoucherEditForm } from "@/components/voucher-edit-form";

export default async function EditVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const voucher = await getVoucherDetail(membership.organizationId, id);

  if (!voucher) notFound();

  return (
    <div className="shell" style={{ maxWidth: 880 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("vouchers.editForm.pageEyebrow")}</div>
          <h1 className="page-title">{t("vouchers.editForm.pageTitle", { voucherNumber: voucher.voucherNumber })}</h1>
          <div className="page-subtitle">
            {t("vouchers.editForm.pageSubtitle")}
          </div>
        </div>
        <Link href={"/vouchers/" + voucher.id} className="btn btn-secondary">{t("common.actions.cancel")}</Link>
      </div>

      <div className="card">
        <VoucherEditForm
          action={updateVoucherAction.bind(null, voucher.id)}
          voucher={voucher}
          labels={{
            lockedNotice: t("vouchers.editForm.lockedNotice", { palletTypeCode: voucher.palletTypeCode }),
            voucherNumber: t("vouchers.editForm.voucherNumber"),
            issueDate: t("vouchers.editForm.issueDate"),
            dueDate: t("vouchers.editForm.dueDate"),
            quantity: t("vouchers.editForm.quantity"),
            notes: t("vouchers.editForm.notes"),
            save: t("vouchers.editForm.save"),
            saving: t("common.actions.saving"),
          }}
        />
      </div>
    </div>
  );
}
