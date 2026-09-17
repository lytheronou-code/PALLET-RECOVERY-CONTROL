import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getPalletType } from "@/lib/data/pallet-types";
import { PalletTypeForm } from "@/components/pallet-type-form";
import { updatePalletTypeAction } from "@/lib/actions/pallet-types";

export default async function EditPalletTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const palletType = await getPalletType(membership.organizationId, id);

  if (!palletType) {
    notFound();
  }

  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <div className="header">
        <div className="brand">Modifica tipo pallet</div>
      </div>
      <div className="card">
        <PalletTypeForm action={updatePalletTypeAction.bind(null, id)} palletType={palletType} />
      </div>
    </div>
  );
}
