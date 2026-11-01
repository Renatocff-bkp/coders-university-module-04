import { Injectable } from "@nestjs/common";

import { getServerEnv } from "../../../shared/config/env";

import type { Environment } from "../domain/environment";

@Injectable()
export class ServerEnvEnvironment implements Environment {
  getOpenAiApiKey(): string | undefined {
    return getServerEnv().OPENAI_API_KEY;
  }
}
