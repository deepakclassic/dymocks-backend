export interface QuestionAnswerJson {
  [questionId: string]: { question: string; answer: string };
}
export interface Message {
  role: RoleType;
  content: string;
}

type RoleType = 'user' | 'system';
