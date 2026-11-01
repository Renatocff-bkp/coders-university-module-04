import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { ListConnectorsUseCase } from "../application/list-connectors.use-case";

@Controller("connectors")
export class ListConnectorsHandler {
  constructor(private readonly listConnectors: ListConnectorsUseCase) {}

  @Get()
  @UseGuards(AuthGuard)
  async execute(@Req() request: RequestWithContext) {
    const userId = request.user?.id ?? "";
    return this.listConnectors.execute({ userId });
  }
}
