import { Injectable, Logger } from "@nestjs/common";

import { SessionService } from "./session.service";

export interface SignOutRequest {
  token: string;
  userId: string;
  requestId?: string;
}

@Injectable()
export class SignOutUseCase {
  private readonly logger = new Logger(SignOutUseCase.name);

  constructor(private readonly sessions: SessionService) {}

  async execute(input: SignOutRequest): Promise<void> {
    await this.sessions.revoke(input.token);

    this.logger.log({
      event: "auth.sign_out.succeeded",
      userId: input.userId,
      requestId: input.requestId,
    });
  }
}
