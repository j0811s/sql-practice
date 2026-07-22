export interface Problem {
  id: number;
  title: string;
  difficulty: number;
  category: string;
  question: string;
  schema: string[];
  seed: string[];
  expectedResult: Record<string, unknown>[];
  hint: string[];
  answerQuery: string;
  orderMatters: boolean;
}
