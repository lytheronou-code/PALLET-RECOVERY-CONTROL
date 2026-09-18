// Supabase-js's `.or()` takes a raw PostgREST filter string, not a
// parameterized value: commas separate OR conditions and parentheses group
// them, so a search term containing either would otherwise splice extra
// clauses into the query (a malformed-query / confusing-results bug at
// minimum -- RLS still confines the caller to their own tenant's rows
// regardless, since organization scoping is a separate `.eq()` plus row
// security underneath, not something this string can reach past). `%`/`_`
// are separately escaped because they're SQL LIKE wildcards.
export function sanitizeOrSearchTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .trim()
    .replace(/[%_]/g, "\\$&");
}
