import { EXPERTS, type Expert } from "../domain/expert";

export class ListExpertsUseCase {
  execute(): Expert[] {
    return EXPERTS;
  }
}
