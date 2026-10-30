import { Injectable } from "@nestjs/common";

import type { PingResult } from "../domain/ping-result";

@Injectable()
export class GetPingUseCase {
  execute(requestId: string): PingResult {
    return {
      message: "pong",
      requestId,
    };
  }
}
