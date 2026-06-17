import type { RawListing, SearchParams } from "../types";

// A site SNAG can watch. Adding a new site = implementing this interface once;
// the rest of the pipeline (match, deal, watch loop) is source-agnostic.
export interface ListingSource {
  readonly key: string; // matches sources.key in the DB ('ebay','mock', ...)
  readonly name: string;
  search(params: SearchParams): Promise<RawListing[]>;
}

// Thrown when an adapter is missing required configuration (e.g. API creds).
// The watch loop catches these per-source so one unconfigured site can't stall
// the others.
export class SourceNotConfiguredError extends Error {
  constructor(
    public readonly sourceKey: string,
    detail: string,
  ) {
    super(`Source "${sourceKey}" is not configured: ${detail}`);
    this.name = "SourceNotConfiguredError";
  }
}

// Registry so the watcher can resolve enabled sources by key.
export class SourceRegistry {
  private readonly sources = new Map<string, ListingSource>();

  register(source: ListingSource): this {
    this.sources.set(source.key, source);
    return this;
  }

  get(key: string): ListingSource | undefined {
    return this.sources.get(key);
  }

  resolve(keys: string[]): ListingSource[] {
    return keys
      .map((k) => this.sources.get(k))
      .filter((s): s is ListingSource => s !== undefined);
  }

  all(): ListingSource[] {
    return [...this.sources.values()];
  }
}
