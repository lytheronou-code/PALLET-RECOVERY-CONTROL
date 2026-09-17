import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/data/organization";
import { getCounterparty } from "@/lib/data/counterparties";
import { CounterpartyForm } from "@/components/counterparty-form";
import { updateCounterpartyAction } from "@/lib/actions/counterparties";

export default async function EditCounterpartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { id } = await params;
  const counterparty = await getCounterparty(membership.organizationId, id);

  if (!counterparty) {
    notFound();
  }

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">Modifica controparte</div>
      </div>
      <div className="card">
        <CounterpartyForm action={updateCounterpartyAction.bind(null, id)} counterparty={counterparty} />
      </div>
    </div>
  );
}
