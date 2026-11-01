import { Module } from "@nestjs/common";

import {
  ListExpertsUseCase,
  GetExpertUseCase,
  GetSuggestionsUseCase,
} from "./application/list-experts.use-case";
import { ExpertCatalogService } from "./application/expert-catalog.service";
import { ExpertsHandler } from "./interface/experts.handler";

@Module({
  controllers: [ExpertsHandler],
  providers: [
    ListExpertsUseCase,
    GetExpertUseCase,
    GetSuggestionsUseCase,
    ExpertCatalogService,
  ],
  exports: [ExpertCatalogService],
})
export class AgentsModule {}
