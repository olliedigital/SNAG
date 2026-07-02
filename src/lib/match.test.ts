import { describe, expect, it } from "vitest";
import { ebaySearchQuery, matchListing } from "./match";
import type { RawListing, WatchlistItem } from "./types";

function item(query: string): WatchlistItem {
  return { id: "i", category: "sneakers", title: query, query, attributes: {}, conditionPref: "any", active: true };
}
function listing(title: string): RawListing {
  return { sourceListingId: "x", title, url: "u", price: 100, currency: "USD" };
}

describe("matchListing (strict)", () => {
  it("requires the model number — Jordan 4 does not match Jordan 13", () => {
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("Air Jordan 13 Retro Bred 2004")).isMatch).toBe(false);
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("Air Jordan 4 Retro OG Bred 2019")).isMatch).toBe(true);
  });

  it("requires every descriptive word (colourway included)", () => {
    expect(matchListing(item("nike minds white"), listing("Nike Minds Black Sneakers")).isMatch).toBe(false);
    expect(matchListing(item("nike minds white"), listing("Nike Minds White Sneakers")).isMatch).toBe(true);
  });

  it("respects gender", () => {
    expect(matchListing(item("nike minds womens white"), listing("Nike Minds Men's White")).isMatch).toBe(false);
    expect(matchListing(item("nike minds womens white"), listing("Nike Minds Women's White")).isMatch).toBe(true);
  });

  it("rejects a conflicting stated size but allows titles with no size", () => {
    expect(matchListing(item("nike minds white size 8"), listing("Nike Minds White Size 10")).isMatch).toBe(false);
    expect(matchListing(item("nike minds white size 8"), listing("Nike Minds White Size 8")).isMatch).toBe(true);
    expect(matchListing(item("nike minds white size 8"), listing("Nike Minds White Sneakers")).isMatch).toBe(true);
  });

  it("drops replica/bootleg listings", () => {
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("Jordan 4 Retro Bred REPLICA")).isMatch).toBe(false);
  });

  it("drops not-a-pair and junk listings", () => {
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("!RIGHT SHOE ONLY! Jordan 4 Retro Bred Size 8.5")).isMatch).toBe(false);
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("Jordan 4 Retro Bred Shoe Box Only")).isMatch).toBe(false);
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("Jordan 4 Retro Bred Sneaker Keychain")).isMatch).toBe(false);
    expect(matchListing(item("Jordan 4 Retro Bred"), listing("Jordan 4 Retro Bred 2019 With Original Box")).isMatch).toBe(true);
  });

  it("strips size phrases from the eBay search query", () => {
    expect(ebaySearchQuery("nike minds womens size 8 white")).toBe("nike minds womens white");
    expect(ebaySearchQuery("Jordan 4 Retro Bred")).toBe("Jordan 4 Retro Bred");
  });
});
