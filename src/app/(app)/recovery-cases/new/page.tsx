import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { RecoveryCaseForm } from "@/components/recovery-case-form";

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
  const params = await searchParams;
  const [counterparties, palletTypes] = await Promise.all([
    listCounterparties(membership.organizationId),
    listPalletTypes(membership.organizationId),
  ]);

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">Nuova pratica di recupero</div>
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
        />
      </div>
    </div>
  );
}
