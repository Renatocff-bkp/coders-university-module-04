import { Injectable } from "@nestjs/common";

import { findExpert, type Expert } from "../domain/expert";

@Injectable()
export class ExpertCatalogService {
  find(key: string): Expert | undefined {
    return findExpert(key);
  }
}
