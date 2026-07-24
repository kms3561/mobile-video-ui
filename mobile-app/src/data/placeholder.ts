export type MediaItem = {
  id: string;
  title: string;
  uploaderId: string;
  tone: 'studio' | 'walk' | 'editing';
};

export type QuestionItem = {
  id: string;
  title: string;
  detail: string;
};

export type MessageItem = {
  id: string;
  sender: string;
  body: string;
  initial: string;
};

export const mediaItems: MediaItem[] = [
  {
    id: 'media-1',
    title: 'Late Night Studio Test',
    uploaderId: '@user_1048',
    tone: 'studio',
  },
  {
    id: 'media-2',
    title: 'Morning Walk Clip',
    uploaderId: '@creator_207',
    tone: 'walk',
  },
  {
    id: 'media-3',
    title: 'Editing Room Preview',
    uploaderId: '@sample_uploads',
    tone: 'editing',
  },
];

export const questions: QuestionItem[] = [
  {
    id: 'question-1',
    title: 'How do I improve low-light video quality?',
    detail: '3 answers - last updated today',
  },
  {
    id: 'question-2',
    title: 'Best export settings for mobile uploads?',
    detail: '8 answers - featured',
  },
  {
    id: 'question-3',
    title: 'Can I save draft uploads?',
    detail: '1 answer - product placeholder',
  },
];

export const messages: MessageItem[] = [
  {
    id: 'message-1',
    sender: '@alex_media',
    body: 'Nice upload. Want feedback on the final cut?',
    initial: 'A',
  },
  {
    id: 'message-2',
    sender: '@rileyqa',
    body: 'Your question has a new placeholder answer.',
    initial: 'R',
  },
  {
    id: 'message-3',
    sender: '@studio_09',
    body: 'Shared a sample workflow with you.',
    initial: 'S',
  },
];
