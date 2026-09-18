import { SiteForm } from "@/components/site-form";
import { createSiteAction } from "@/lib/actions/sites";
import { requireMembership } from "@/lib/data/organization";
import { listCounterparties } from "@/lib/data/counterparties";

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ counterpartyId?: string }>;
}) {
  const membership = await requireMembership();
  const { counterpartyId } = await searchParams;
  const counterparties = await listCounterparties(membership.organizationId);

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Master data</div>
          <h1 className="page-title">Nuovo sito</h1>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <SiteForm
            action={createSiteAction}
            counterparties={counterparties}
            defaultCounterpartyId={counterpartyId}
          />
        </div>
      </div>
    </div>
  );
}
