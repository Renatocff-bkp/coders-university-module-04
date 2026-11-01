import { EXPERTS, type Expert } from "../domain/expert";

export class GetExpertUseCase {
  execute(key: string): Expert | undefined {
    return EXPERTS.find((e) => e.key === key);
  }
}
