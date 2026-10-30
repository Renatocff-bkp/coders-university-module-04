import { Injectable } from "@nestjs/common";
import bcrypt from "bcrypt";

import type { PasswordHasher } from "../domain/password-hasher";

const BCRYPT_COST = 12;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, BCRYPT_COST);
  }

  verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
