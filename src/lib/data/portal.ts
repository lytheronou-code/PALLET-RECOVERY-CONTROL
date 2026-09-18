import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "@/lib/pagination";

export type PortalContext = {
  organizationId: string;
  counterpartyId: string;
  counterpartyName: string;
  role: string;
};

// portal_get_context() is SECURITY DEFINER and resolves strictly from the
// caller's own client_portal_memberships row (auth.uid()) -- there is no
// client-supplied org/counterparty id anywhere in this call to forge.
export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_get_context");
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    organizationId: row.organization_id,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name,
    role: row.role,
  };
}

// Used by the portal route group's own layout, mirroring requireMembership()
// for the internal app: bail out to "/" (which re-resolves the right
// workspace for this user) rather than rendering the portal shell for
// someone with no active client-portal membership.
export async function requirePortalContext(): Promise<PortalContext> {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }
  return context;
}

export type PortalSummary = {
  outstandingPallets: number;
  estimatedExposure: number;
  openVouchersCount: number;
  activeRecoveryCasesCount: number;
  recoveredPallets: number;
  recoveredValue: number;
  nextDueDate: string | null;
};

export async function getPortalSummary(): Promise<PortalSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_counterparty_summary");
  if (error || !data || data.length === 0) {
    return {
      outstandingPallets: 0,
      estimatedExposure: 0,
      openVouchersCount: 0,
      activeRecoveryCasesCount: 0,
      recoveredPallets: 0,
      recoveredValue: 0,
      nextDueDate: null,
    };
  }
  const row = data[0];
  return {
    outstandingPallets: Number(row.outstanding_pallets),
    estimatedExposure: Number(row.estimated_exposure),
    openVouchersCount: row.open_vouchers_count,
    activeRecoveryCasesCount: row.active_recovery_cases_count,
    recoveredPallets: Number(row.recovered_pallets),
    recoveredValue: Number(row.recovered_value),
    nextDueDate: row.next_due_date,
  };
}

export type PortalVoucher = {
  id: string;
  voucherNumber: string;
  quantity: number;
  recoveredQuantity: number;
  outstandingQuantity: number;
  issueDate: string;
  recoveryDueDate: string | null;
  status: string;
  palletTypeCode: string;
  siteName: string | null;
};

export async function listPortalVouchers(page: number): Promise<PaginatedResult<PortalVoucher>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_list_vouchers", {
    p_page: page,
    p_page_size: DEFAULT_PAGE_SIZE,
  });
  if (error || !data) return emptyPage(page);
  const total = data[0]?.total_count ?? 0;
  return {
    items: data.map((row) => ({
      id: row.id,
      voucherNumber: row.voucher_number,
      quantity: row.quantity,
      recoveredQuantity: row.recovered_quantity,
      outstandingQuantity: row.outstanding_quantity,
      issueDate: row.issue_date,
      recoveryDueDate: row.recovery_due_date,
      status: row.status,
      palletTypeCode: row.pallet_type_code,
      siteName: row.site_name,
    })),
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
  };
}

export type PortalMovement = {
  id: string;
  movementDate: string;
  direction: string;
  quantity: number;
  documentType: string | null;
  documentNumber: string | null;
  palletTypeCode: string;
  siteName: string | null;
};

export async function listPortalMovements(page: number): Promise<PaginatedResult<PortalMovement>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_list_movements", {
    p_page: page,
    p_page_size: DEFAULT_PAGE_SIZE,
  });
  if (error || !data) return emptyPage(page);
  const total = data[0]?.total_count ?? 0;
  return {
    items: data.map((row) => ({
      id: row.id,
      movementDate: row.movement_date,
      direction: row.direction,
      quantity: row.quantity,
      documentType: row.document_type,
      documentNumber: row.document_number,
      palletTypeCode: row.pallet_type_code,
      siteName: row.site_name,
    })),
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
  };
}

export type PortalRecoveryCase = {
  id: string;
  reference: string;
  palletTypeCode: string;
  quantityClaimed: number;
  quantityRecovered: number;
  outstandingQuantity: number;
  outstandingValue: number;
  dueDate: string | null;
  priority: string;
  status: string;
  openedAt: string;
};

export async function listPortalRecoveryCases(page: number): Promise<PaginatedResult<PortalRecoveryCase>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_list_recovery_cases", {
    p_page: page,
    p_page_size: DEFAULT_PAGE_SIZE,
  });
  if (error || !data) return emptyPage(page);
  const total = data[0]?.total_count ?? 0;
  return {
    items: data.map((row) => ({
      id: row.id,
      reference: row.reference,
      palletTypeCode: row.pallet_type_code,
      quantityClaimed: row.quantity_claimed,
      quantityRecovered: row.quantity_recovered,
      outstandingQuantity: row.outstanding_quantity,
      outstandingValue: Number(row.outstanding_value),
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      openedAt: row.opened_at,
    })),
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
  };
}

export type PortalDocument = {
  id: string;
  documentType: string;
  originalFilename: string;
  uploadedAt: string;
  notes: string | null;
};

export async function listPortalDocuments(page: number): Promise<PaginatedResult<PortalDocument>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_list_documents", {
    p_page: page,
    p_page_size: DEFAULT_PAGE_SIZE,
  });
  if (error || !data) return emptyPage(page);
  const total = data[0]?.total_count ?? 0;
  return {
    items: data.map((row) => ({
      id: row.id,
      documentType: row.document_type,
      originalFilename: row.original_filename,
      uploadedAt: row.uploaded_at,
      notes: row.notes,
    })),
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
  };
}

function emptyPage<T>(page: number): PaginatedResult<T> {
  return { items: [], total: 0, page, pageSize: DEFAULT_PAGE_SIZE, pageCount: 1 };
}
