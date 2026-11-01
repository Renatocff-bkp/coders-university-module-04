import { Controller, Get } from "@nestjs/common";

import { ListExpertsUseCase } from "../application/list-experts.use-case";

@Controller("experts")
export class ListExpertsHandler {
  constructor(private readonly listExperts: ListExpertsUseCase) {}

  @Get()
  execute() {
    return this.listExperts.execute();
  }
}
