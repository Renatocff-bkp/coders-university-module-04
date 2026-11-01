import { Module } from "@nestjs/common";

import {
  ListExpertsUseCase,
  GetExpertUseCase,
  GetSuggestionsUseCase,
} from "./application/list-experts.use-case";
import { ExpertsHandler } from "./interface/experts.handler";

@Module({
  controllers: [ExpertsHandler],
  providers: [ListExpertsUseCase, GetExpertUseCase, GetSuggestionsUseCase],
})
export class AgentsModule {}
