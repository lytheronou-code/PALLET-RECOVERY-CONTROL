import { PalletTypeForm } from "@/components/pallet-type-form";
import { createPalletTypeAction } from "@/lib/actions/pallet-types";
import { requireMembership } from "@/lib/data/organization";
import { getPageContext } from "@/i18n/server";

export default async function NewPalletTypePage() {
  const membership = await requireMembership();
  const { t, currency } = await getPageContext(membership.organizationId);

  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <div className="header">
        <div className="brand">{t("palletTypes.new")}</div>
      </div>
      <div className="card">
        <PalletTypeForm
          action={createPalletTypeAction}
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
