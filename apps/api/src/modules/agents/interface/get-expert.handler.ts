import { Controller, Get, Param } from "@nestjs/common";

import { GetExpertUseCase } from "../application/get-expert.use-case";

@Controller("experts")
export class GetExpertHandler {
  constructor(private readonly getExpert: GetExpertUseCase) {}

  @Get(":key")
  execute(@Param("key") key: string) {
    const expert = this.getExpert.execute(key);
    if (!expert) {
      return { error: { code: "NOT_FOUND", message: "Expert not found" } };
    }
    return expert;
  }
}
