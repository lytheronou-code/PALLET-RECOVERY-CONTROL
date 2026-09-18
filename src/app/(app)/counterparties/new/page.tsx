import { CounterpartyForm } from "@/components/counterparty-form";
import { createCounterpartyAction } from "@/lib/actions/counterparties";

export default function NewCounterpartyPage() {
  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="header">
        <div className="brand">Nuova controparte</div>
      </div>
      <div className="card">
        <CounterpartyForm action={createCounterpartyAction} />
      </div>
    </div>
  );
}
