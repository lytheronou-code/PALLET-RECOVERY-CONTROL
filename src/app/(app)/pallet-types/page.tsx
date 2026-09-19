import Link from "next/link";
import { requireMembership } from "@/lib/data/organization";
import { listPalletTypes } from "@/lib/data/pallet-types";
import { setPalletTypeActiveAction } from "@/lib/actions/pallet-types";
import { getPageContext } from "@/i18n/server";

export default async function PalletTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  const membership = await requireMembership();
  const { t, formatCurrency } = await getPageContext(membership.organizationId);
  const { inactive } = await searchParams;
  const showInactive = inactive === "1";
  const palletTypes = await listPalletTypes(membership.organizationId, { includeInactive: showInactive });

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">{t("palletTypes.title")}</div>
        <Link href="/pallet-types/new" className="btn btn-primary" style={{ width: "auto" }}>
          {t("palletTypes.new")}
        </Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Link href={showInactive ? "/pallet-types" : "/pallet-types?inactive=1"} className="muted">
          {showInactive ? t("palletTypes.showInactiveOnly") : t("palletTypes.showAllIncludingInactive")}
        </Link>
      </div>

      <div className="card">
        {palletTypes.length === 0 ? (
          <div className="empty-state">{t("palletTypes.empty")}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("palletTypes.table.code")}</th>
                <th>{t("palletTypes.table.description")}</th>
                <th>{t("palletTypes.table.unitValue")}</th>
                <th>{t("palletTypes.table.status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {palletTypes.map((pt) => (
                <tr key={pt.id}>
                  <td>
                    <Link href={`/pallet-types/${pt.id}/edit`}>{pt.code}</Link>
                  </td>
                  <td>{pt.description}</td>
                  <td>{formatCurrency(pt.unit_value)}</td>
                  <td>
                    <span className={`badge ${pt.active ? "badge-closed" : "badge-neutral"}`}>
                      {pt.active ? t("palletTypes.active") : t("palletTypes.inactive")}
                    </span>
                  </td>
                  <td>
                    <form action={setPalletTypeActiveAction.bind(null, pt.id, !pt.active)}>
                      <button type="submit" className="btn btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}>
                        {pt.active ? t("palletTypes.deactivate") : t("palletTypes.reactivate")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
