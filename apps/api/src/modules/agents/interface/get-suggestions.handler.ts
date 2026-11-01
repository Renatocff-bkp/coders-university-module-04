import { Controller, Get, Param } from "@nestjs/common";

import { GetSuggestionsUseCase } from "../application/get-suggestions.use-case";

@Controller("experts")
export class GetSuggestionsHandler {
  constructor(private readonly getSuggestions: GetSuggestionsUseCase) {}

  @Get(":key/suggestions")
  execute(@Param("key") key: string) {
    return { suggestions: this.getSuggestions.execute(key) };
  }
}
