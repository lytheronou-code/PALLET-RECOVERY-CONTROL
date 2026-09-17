import { PalletTypeForm } from "@/components/pallet-type-form";
import { createPalletTypeAction } from "@/lib/actions/pallet-types";

export default function NewPalletTypePage() {
  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <div className="header">
        <div className="brand">Nuovo tipo pallet</div>
      </div>
      <div className="card">
        <PalletTypeForm action={createPalletTypeAction} />
      </div>
    </div>
  );
}
