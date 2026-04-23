import { describe, expect, it } from "vitest";

import { parsePartyCsv } from "@/lib/csv";

describe("parsePartyCsv", () => {
  it("parses semicolon-separated guests and tags", () => {
    const [row] = parsePartyCsv(
      "label,email,phone,guests,tags,notes\nTaylor & Jordan,test@example.com,+1555,Taylor Russo;Jordan Russo,friends;vip,hello",
    );

    expect(row.label).toBe("Taylor & Jordan");
    expect(row.guests).toEqual(["Taylor Russo", "Jordan Russo"]);
    expect(row.tags).toEqual(["friends", "vip"]);
    expect(row.email).toBe("test@example.com");
  });
});
