import { describe, expect, it } from "vitest";

import {
  ListExpertsUseCase,
  GetExpertUseCase,
  GetSuggestionsUseCase,
} from "./list-experts.use-case";
import { EXPERTS } from "../domain/expert";

describe("ListExpertsUseCase", () => {
  it("returns all experts", () => {
    const uc = new ListExpertsUseCase();
    const result = uc.execute();
    expect(result.length).toBe(EXPERTS.length);
    expect(result[0]?.key).toBe("ceo");
  });
});

describe("GetExpertUseCase", () => {
  it("returns expert by key", () => {
    const uc = new GetExpertUseCase();
    expect(uc.execute("cto")?.key).toBe("cto");
    expect(uc.execute("nope")).toBeUndefined();
  });
});

describe("GetSuggestionsUseCase", () => {
  it("returns suggestions for expert", () => {
    const uc = new GetSuggestionsUseCase();
    expect(uc.execute("ceo").length).toBeGreaterThan(0);
    expect(uc.execute("nope")).toEqual([]);
  });
});
