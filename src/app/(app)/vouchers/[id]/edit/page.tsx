import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getVoucherDetail } from "@/lib/data/vouchers";
import { updateVoucherAction } from "@/lib/actions/vouchers";
import { VoucherEditForm } from "@/components/voucher-edit-form";

export default async function EditVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const voucher = await getVoucherDetail(membership.organizationId, id);

  if (!voucher) notFound();

  return (
    <div className="shell" style={{ maxWidth: 880 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Controlled correction</div>
          <h1 className="page-title">Modifica {voucher.voucherNumber}</h1>
          <div className="page-subtitle">
            Correggi riferimento, date, quantità e note senza rompere la storia di recovery.
          </div>
        </div>
        <Link href={"/vouchers/" + voucher.id} className="btn btn-secondary">Annulla</Link>
      </div>

      <div className="card">
        <VoucherEditForm action={updateVoucherAction.bind(null, voucher.id)} voucher={voucher} />
      </div>
    </div>
  );
}
