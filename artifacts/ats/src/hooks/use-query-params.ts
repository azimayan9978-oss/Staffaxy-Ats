import { useMemo } from "react";
import { useSearch } from "wouter";

/**
 * Reads the current URL's query string (e.g. "?status=Open&clientId=3")
 * and returns it as a URLSearchParams object. Re-parses only when the
 * search string actually changes.
 */
export function useQueryParams(): URLSearchParams {
  const search = useSearch();
  return useMemo(() => new URLSearchParams(search), [search]);
}
