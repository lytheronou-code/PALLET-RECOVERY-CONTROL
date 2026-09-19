import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getPalletType } from "@/lib/data/pallet-types";
import { PalletTypeForm } from "@/components/pallet-type-form";
import { updatePalletTypeAction } from "@/lib/actions/pallet-types";
import { getPageContext } from "@/i18n/server";

export default async function EditPalletTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t, currency } = await getPageContext(membership.organizationId);
  const { id } = await params;
  const palletType = await getPalletType(membership.organizationId, id);

  if (!palletType) {
    notFound();
  }

  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <div className="header">
        <div className="brand">{t("palletTypes.editTitle")}</div>
      </div>
      <div className="card">
        <PalletTypeForm
          action={updatePalletTypeAction.bind(null, id)}
          palletType={palletType}
          labels={{
            code: t("palletTypes.table.code"),
            description: t("palletTypes.table.description"),
            unitValue: t("palletTypes.fields.unitValue", { currency }),
            unitValueEditNote: t("palletTypes.fields.unitValueEditNote"),
            saving: t("common.actions.saving"),
            createSubmit: t("palletTypes.new"),
            saveSubmit: t("common.actions.saveChanges"),
          }}
        />
      </div>
    </div>
  );
}
