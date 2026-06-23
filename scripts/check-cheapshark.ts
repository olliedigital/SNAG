// Quick live check of the CheapShark adapter against the real API (no key).
// Run: `npx tsx scripts/check-cheapshark.ts "Elden Ring"`
import { CheapSharkSource } from "../src/lib/sources/cheapshark";

async function main() {
  const source = new CheapSharkSource();
  const query = process.argv[2] ?? "Elden Ring";

  const listings = await source.search({ query, category: "games", limit: 8 });
  console.log(`CheapShark "${query}": ${listings.length} listings\n`);
  for (const l of listings) {
    console.log(`  $${l.price.toFixed(2).padStart(7)}  ${l.title}`);
    console.log(`            ${l.url}`);
  }
  if (listings.length === 0) console.log("(no results — try another title)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
