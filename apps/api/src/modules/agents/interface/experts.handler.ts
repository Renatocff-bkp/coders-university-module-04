import { Controller, Get, Param } from "@nestjs/common";

import { ListExpertsUseCase } from "../application/list-experts.use-case";
import { GetExpertUseCase } from "../application/get-expert.use-case";
import { GetSuggestionsUseCase } from "../application/get-suggestions.use-case";

@Controller("experts")
export class ExpertsHandler {
  constructor(
    private readonly listExperts: ListExpertsUseCase,
    private readonly getExpert: GetExpertUseCase,
    private readonly getSuggestions: GetSuggestionsUseCase,
  ) {}

  @Get()
  list() {
    return this.listExperts.execute();
  }

  @Get(":key")
  get(@Param("key") key: string) {
    const expert = this.getExpert.execute(key);
    if (!expert) {
      return { error: { code: "NOT_FOUND", message: "Expert not found" } };
    }
    return expert;
  }

  @Get(":key/suggestions")
  suggestions(@Param("key") key: string) {
    return { suggestions: this.getSuggestions.execute(key) };
  }
}
