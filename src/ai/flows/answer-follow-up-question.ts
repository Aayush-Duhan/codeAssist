// This file defines a Genkit flow for answering follow-up questions about coding problems, utilizing conversation history for context.
// It exports the answerFollowUpQuestion function, AnswerFollowUpQuestionInput type, and AnswerFollowUpQuestionOutput type.
'use server';

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnswerFollowUpQuestionInputSchema = z.object({
  question: z.string().describe('The follow-up question to answer.'),
  conversationHistory: z.array(
    z.object({
      user: z.string().describe('The user input.'),
      assistant: z.string().describe('The assistant response.'),
    })
  ).optional().describe('The history of the conversation to provide context.'),
});
export type AnswerFollowUpQuestionInput = z.infer<typeof AnswerFollowUpQuestionInputSchema>;

const AnswerFollowUpQuestionOutputSchema = z.object({
  answer: z.string().describe('The plain text answer to the follow-up question.'),
});
export type AnswerFollowUpQuestionOutput = z.infer<typeof AnswerFollowUpQuestionOutputSchema>;

export async function answerFollowUpQuestion(input: AnswerFollowUpQuestionInput): Promise<AnswerFollowUpQuestionOutput> {
  return answerFollowUpQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerFollowUpQuestionPrompt',
  input: {
    schema: z.object({
      question: z.string().describe('The follow-up question to answer.'),
      conversationHistory: z.array(
        z.object({
          user: z.string().describe('The user input.'),
          assistant: z.string().describe('The assistant response.'),
        })
      ).optional().describe('The history of the conversation to provide context.'),
    }),
  },
  output: {
    schema: z.object({
      answer: z.string().describe('The plain text answer to the follow-up question.'),
    }),
  },
  prompt: `You are a coding assistant helping a user understand a coding problem.

  Answer the user's follow-up question based on the conversation history, if any.  Provide a helpful plain text response.

  Current question: {{{question}}}

  {{#if conversationHistory}}
  Previous interactions:
  {{#each conversationHistory}}
  User: {{{this.user}}}
  Assistant: {{{this.assistant}}}
  {{/each}}
  {{else}}
  No previous interactions.
  {{/if}}
  `,
});

const answerFollowUpQuestionFlow = ai.defineFlow<
  typeof AnswerFollowUpQuestionInputSchema,
  typeof AnswerFollowUpQuestionOutputSchema
>(
  {
    name: 'answerFollowUpQuestionFlow',
    inputSchema: AnswerFollowUpQuestionInputSchema,
    outputSchema: AnswerFollowUpQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
