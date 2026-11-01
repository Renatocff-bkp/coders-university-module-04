import { Module } from "@nestjs/common";

import { ListExpertsUseCase } from "./application/list-experts.use-case";
import { GetExpertUseCase } from "./application/get-expert.use-case";
import { GetSuggestionsUseCase } from "./application/get-suggestions.use-case";
import { ExpertCatalogService } from "./application/expert-catalog.service";
import { ListExpertsHandler } from "./interface/list-experts.handler";
import { GetExpertHandler } from "./interface/get-expert.handler";
import { GetSuggestionsHandler } from "./interface/get-suggestions.handler";

@Module({
  controllers: [ListExpertsHandler, GetExpertHandler, GetSuggestionsHandler],
  providers: [
    ListExpertsUseCase,
    GetExpertUseCase,
    GetSuggestionsUseCase,
    ExpertCatalogService,
  ],
  exports: [ExpertCatalogService],
})
export class AgentsModule {}
