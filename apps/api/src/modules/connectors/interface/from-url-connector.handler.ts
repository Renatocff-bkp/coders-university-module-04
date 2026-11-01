import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { CreateConnectorFromUrlUseCase } from "../application/create-connector-from-url.use-case";

@Controller("connectors")
export class FromUrlConnectorHandler {
  constructor(private readonly createFromUrl: CreateConnectorFromUrlUseCase) {}

  @Post("url")
  @UseGuards(AuthGuard)
  async execute(
    @Req() request: RequestWithContext & { body?: { url?: string } },
  ) {
    const userId = request.user?.id ?? "";
    const url = request.body?.url ?? "";
    return this.createFromUrl.execute({ userId, url });
  }
}
