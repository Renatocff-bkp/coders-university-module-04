import { EXPERTS, type Expert } from "../domain/expert";

export class ListExpertsUseCase {
  execute(): Expert[] {
    return EXPERTS;
  }
}

export class GetExpertUseCase {
  execute(key: string): Expert | undefined {
    return EXPERTS.find((e) => e.key === key);
  }
}

export class GetSuggestionsUseCase {
  execute(key: string): string[] {
    return EXPERTS.find((e) => e.key === key)?.suggestions ?? [];
  }
}
