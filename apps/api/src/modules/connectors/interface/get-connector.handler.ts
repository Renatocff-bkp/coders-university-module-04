import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth";
import { GetConnectorUseCase } from "../application/get-connector.use-case";

@Controller("connectors")
export class GetConnectorHandler {
  constructor(private readonly getConnector: GetConnectorUseCase) {}

  @Get(":id")
  @UseGuards(AuthGuard)
  async execute(@Param("id") id: string) {
    return this.getConnector.execute({ id });
  }
}
