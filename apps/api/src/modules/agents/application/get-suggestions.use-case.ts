import { EXPERTS } from "../domain/expert";

export class GetSuggestionsUseCase {
  execute(key: string): string[] {
    return EXPERTS.find((e) => e.key === key)?.suggestions ?? [];
  }
}
