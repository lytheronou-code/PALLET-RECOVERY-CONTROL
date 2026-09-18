import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { listActiveSitesForPicker } from "@/lib/data/sites";
import { createVoucherAction } from "@/lib/actions/vouchers";
import { VoucherForm } from "@/components/voucher-form";

export default async function NewVoucherPage() {
  const membership = await requireMembership();
  const [counterparties, palletTypes, sites] = await Promise.all([
    listCounterparties(membership.organizationId),
    listPalletTypes(membership.organizationId),
    listActiveSitesForPicker(membership.organizationId),
  ]);

  return (
    <div className="shell" style={{ maxWidth: 880 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Pallet credit</div>
          <h1 className="page-title">Nuovo buono</h1>
          <div className="page-subtitle">
            Il buono alimenta riconciliazione, scadenzario e pratica di recupero.
          </div>
        </div>
        <Link href="/vouchers" className="btn btn-secondary">Annulla</Link>
      </div>

      <div className="card">
        {counterparties.length === 0 || palletTypes.length === 0 ? (
          <div className="form-error">
            Prima di creare un buono servono almeno una controparte attiva e un tipo pallet attivo.
          </div>
        ) : null}
        <VoucherForm action={createVoucherAction} counterparties={counterparties} palletTypes={palletTypes} sites={sites} />
      </div>
    </div>
  );
}
