import { Inject, Injectable } from "@nestjs/common";

import { CONNECTOR_REPOSITORY } from "../connectors.tokens";
import type { ConnectorRepository } from "../domain/connector-repository";

@Injectable()
export class GetConnectorUseCase {
  constructor(
    @Inject(CONNECTOR_REPOSITORY) private readonly repo: ConnectorRepository,
  ) {}

  async execute(input: { id: string }) {
    return this.repo.findById(input.id);
  }
}
