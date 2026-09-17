// Deterministic reconciliation engine — no AI, no heuristics beyond plain
// arithmetic and exact-match grouping. Pure and side-effect free so it can
// be unit tested without a database.

export type MovementInput = {
  id: string;
  counterpartyId: string;
  palletTypeId: string;
  direction: "inbound" | "outbound";
  quantity: number;
  documentNumber: string | null;
};

export type VoucherInput = {
  id: string;
  counterpartyId: string;
  palletTypeId: string;
  quantity: number;
  recoveredQuantity: number;
  status: string;
  recoveryDueDate: string | null;
};

export type PalletTypeInput = { id: string; code: string; unitValue: number };
export type CounterpartyInput = { id: string; legalName: string };

export type BalanceRow = {
  counterpartyId: string;
  counterpartyName: string;
  palletTypeId: string;
  palletTypeCode: string;
  unitValue: number;
  outboundQuantity: number;
  inboundQuantity: number;
  theoreticalBalance: number; // outbound - inbound, from raw movements
  voucherOpenQuantity: number; // sum(quantity - recovered_quantity) over open/partial vouchers
  outstandingQuantity: number; // the balance reconciliation treats as owed
  outstandingValue: number; // outstandingQuantity * current unit value (not a snapshot)
};

export type Finding =
  | { type: "unbalanced_movements"; counterpartyId: string; palletTypeId: string; outstandingQuantity: number }
  | { type: "open_voucher"; voucherId: string; counterpartyId: string; palletTypeId: string; outstandingQuantity: number }
  | { type: "duplicate_document"; documentNumber: string; counterpartyId: string; palletTypeId: string; movementIds: string[] }
  | { type: "missing_documentation"; movementId: string; counterpartyId: string; palletTypeId: string }
  | { type: "voucher_due_soon"; voucherId: string; dueDate: string; daysUntilDue: number }
  | { type: "voucher_overdue"; voucherId: string; dueDate: string; daysOverdue: number };

export type ReconciliationResult = {
  balances: BalanceRow[];
  findings: Finding[];
};

const OPEN_VOUCHER_STATUSES = new Set(["open", "partial"]);
const DUE_SOON_DAYS = 14;

function groupKey(counterpartyId: string, palletTypeId: string): string {
  return `${counterpartyId}::${palletTypeId}`;
}

export function reconcile(
  movements: MovementInput[],
  vouchers: VoucherInput[],
  counterparties: CounterpartyInput[],
  palletTypes: PalletTypeInput[],
  today: Date = new Date(),
): ReconciliationResult {
  const counterpartyById = new Map(counterparties.map((c) => [c.id, c]));
  const palletTypeById = new Map(palletTypes.map((p) => [p.id, p]));

  const groups = new Map<
    string,
    { counterpartyId: string; palletTypeId: string; outbound: number; inbound: number; voucherOpen: number }
  >();

  function ensureGroup(counterpartyId: string, palletTypeId: string) {
    const key = groupKey(counterpartyId, palletTypeId);
    let group = groups.get(key);
    if (!group) {
      group = { counterpartyId, palletTypeId, outbound: 0, inbound: 0, voucherOpen: 0 };
      groups.set(key, group);
    }
    return group;
  }

  for (const movement of movements) {
    const group = ensureGroup(movement.counterpartyId, movement.palletTypeId);
    if (movement.direction === "outbound") {
      group.outbound += movement.quantity;
    } else {
      group.inbound += movement.quantity;
    }
  }

  for (const voucher of vouchers) {
    if (OPEN_VOUCHER_STATUSES.has(voucher.status)) {
      const group = ensureGroup(voucher.counterpartyId, voucher.palletTypeId);
      group.voucherOpen += Math.max(0, voucher.quantity - voucher.recoveredQuantity);
    }
  }

  const balances: BalanceRow[] = Array.from(groups.values()).map((group) => {
    const counterparty = counterpartyById.get(group.counterpartyId);
    const palletType = palletTypeById.get(group.palletTypeId);
    const theoreticalBalance = group.outbound - group.inbound;
    // The physical movement ledger is the ground truth for what's outstanding;
    // vouchers are a documentation trail surfaced separately so mismatches
    // between the two are visible as findings rather than silently averaged.
    const outstandingQuantity = Math.max(0, theoreticalBalance);
    const unitValue = palletType?.unitValue ?? 0;

    return {
      counterpartyId: group.counterpartyId,
      counterpartyName: counterparty?.legalName ?? "—",
      palletTypeId: group.palletTypeId,
      palletTypeCode: palletType?.code ?? "—",
      unitValue,
      outboundQuantity: group.outbound,
      inboundQuantity: group.inbound,
      theoreticalBalance,
      voucherOpenQuantity: group.voucherOpen,
      outstandingQuantity,
      outstandingValue: outstandingQuantity * unitValue,
    };
  });

  balances.sort((a, b) => b.outstandingValue - a.outstandingValue);

  const findings: Finding[] = [];

  for (const balance of balances) {
    if (balance.theoreticalBalance > 0) {
      findings.push({
        type: "unbalanced_movements",
        counterpartyId: balance.counterpartyId,
        palletTypeId: balance.palletTypeId,
        outstandingQuantity: balance.theoreticalBalance,
      });
    }
  }

  for (const voucher of vouchers) {
    if (OPEN_VOUCHER_STATUSES.has(voucher.status)) {
      findings.push({
        type: "open_voucher",
        voucherId: voucher.id,
        counterpartyId: voucher.counterpartyId,
        palletTypeId: voucher.palletTypeId,
        outstandingQuantity: Math.max(0, voucher.quantity - voucher.recoveredQuantity),
      });
    }

    if (voucher.recoveryDueDate) {
      const dueDate = new Date(voucher.recoveryDueDate);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (OPEN_VOUCHER_STATUSES.has(voucher.status)) {
        if (diffDays < 0) {
          findings.push({
            type: "voucher_overdue",
            voucherId: voucher.id,
            dueDate: voucher.recoveryDueDate,
            daysOverdue: Math.abs(diffDays),
          });
        } else if (diffDays <= DUE_SOON_DAYS) {
          findings.push({
            type: "voucher_due_soon",
            voucherId: voucher.id,
            dueDate: voucher.recoveryDueDate,
            daysUntilDue: diffDays,
          });
        }
      }
    }
  }

  for (const movement of movements) {
    if (!movement.documentNumber || movement.documentNumber.trim() === "") {
      findings.push({
        type: "missing_documentation",
        movementId: movement.id,
        counterpartyId: movement.counterpartyId,
        palletTypeId: movement.palletTypeId,
      });
    }
  }

  const documentGroups = new Map<string, MovementInput[]>();
  for (const movement of movements) {
    if (!movement.documentNumber) continue;
    const key = `${movement.counterpartyId}::${movement.palletTypeId}::${movement.direction}::${movement.documentNumber.trim().toLowerCase()}`;
    const list = documentGroups.get(key) ?? [];
    list.push(movement);
    documentGroups.set(key, list);
  }
  for (const [, movementsWithSameDoc] of documentGroups) {
    if (movementsWithSameDoc.length > 1) {
      findings.push({
        type: "duplicate_document",
        documentNumber: movementsWithSameDoc[0].documentNumber!,
        counterpartyId: movementsWithSameDoc[0].counterpartyId,
        palletTypeId: movementsWithSameDoc[0].palletTypeId,
        movementIds: movementsWithSameDoc.map((m) => m.id),
      });
    }
  }

  return { balances, findings };
}
