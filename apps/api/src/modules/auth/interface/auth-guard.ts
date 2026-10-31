import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { SessionService } from "../application/session.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      });
    }

    const token = authorization.slice("Bearer ".length).trim();
    const userId = await this.sessionService.validate(token);

    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }

    request.user = { id: userId };

    return true;
  }
}
