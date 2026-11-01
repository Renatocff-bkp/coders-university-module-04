import { Injectable } from "@nestjs/common";

import { EXPERTS, type Expert } from "../domain/expert";

@Injectable()
export class ExpertCatalogService {
  private readonly byKey = new Map(EXPERTS.map((e) => [e.key, e]));

  find(key: string): Expert | undefined {
    return this.byKey.get(key as Expert["key"]);
  }
}
