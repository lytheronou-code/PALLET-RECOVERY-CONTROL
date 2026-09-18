import { notFound } from "next/navigation";
import { SiteForm } from "@/components/site-form";
import { updateSiteAction } from "@/lib/actions/sites";
import { requireMembership } from "@/lib/data/organization";
import { getSite } from "@/lib/data/sites";
import { listCounterparties } from "@/lib/data/counterparties";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const [site, counterparties] = await Promise.all([
    getSite(membership.organizationId, id),
    listCounterparties(membership.organizationId, { includeInactive: true }),
  ]);

  if (!site) notFound();

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Master data</div>
          <h1 className="page-title">{site.name}</h1>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <SiteForm action={updateSiteAction.bind(null, site.id)} site={site} counterparties={counterparties} />
        </div>
      </div>
    </div>
  );
}
