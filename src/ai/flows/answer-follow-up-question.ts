// This file defines a Genkit flow that can either answer follow-up questions
// about coding problems using conversation history or generate a structured solution
// for a new coding problem.
'use server';

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
// Import the output schema from the code generation flow
import { GenerateCodeSolutionOutputSchema as ImportedGenerateCodeSolutionOutputSchema } from './generate-code-solution';

// Define the input schema, including conversation history
const AnswerFollowUpQuestionInputSchema = z.object({
  question: z.string().describe('The user question (can be a new problem or a follow-up).'),
  conversationHistory: z
    .array(
      z.object({
        // Assuming history stored from the API perspective
        user: z.string().describe('The user input.'),
        // Storing the raw assistant response (which could be solution JSON or text answer)
        assistant: z.string().describe('The raw assistant response (JSON string or text).'),
      })
    )
    .optional()
    .describe('The history of the conversation to provide context.'),
});
export type AnswerFollowUpQuestionInput = z.infer<typeof AnswerFollowUpQuestionInputSchema>;

// Define the schema for a structured code solution response
const StructuredSolutionSchema = ImportedGenerateCodeSolutionOutputSchema.extend({
  type: z.literal('solution').describe('Indicates the response type is a structured solution.'),
});

// Define the schema for a plain text response
const PlainTextResponseSchema = z.object({
  type: z.literal('response').describe('Indicates the response type is a plain text answer.'),
  answer: z.string().describe('The plain text answer to the question.'),
});

// Define the output schema as a union of the two possible response types
const AnswerFollowUpQuestionOutputSchema = z.union([StructuredSolutionSchema, PlainTextResponseSchema]);
export type AnswerFollowUpQuestionOutput = z.infer<typeof AnswerFollowUpQuestionOutputSchema>;

// Export a function to call the flow (optional, but good practice)
export async function answerFollowUpQuestion(input: AnswerFollowUpQuestionInput): Promise<AnswerFollowUpQuestionOutput> {
  return answerFollowUpQuestionFlow(input);
}

// Define the prompt for the AI model
const prompt = ai.definePrompt({
  name: 'answerOrGeneratePrompt', // Renamed for clarity
  input: {
    schema: AnswerFollowUpQuestionInputSchema, // Use the updated input schema
  },
  output: {
    // Specify the desired output format (JSON) and the union schema
    format: 'json', // Moved format specifier here
    schema: AnswerFollowUpQuestionOutputSchema,
  },
  // Updated prompt instructions
  prompt: `You are an advanced coding assistant. Analyze the user's "Current question".

1.  **If the question appears to be a NEW coding problem:** Respond with a structured JSON object matching the 'solution' type. This JSON should contain:
    - "type": "solution"
    - "problemStatement": A clear description of the problem.
    - "approach": Explanation of how to solve it.
    - "codeSnippet": A Python code example.
    - "timeComplexity": Time complexity analysis.
    - "spaceComplexity": Space complexity analysis.
    - "dryRun": Step-by-step execution with an example.
    - "testCases": At least two test cases (input and output pairs).

2.  **If the question seems like a follow-up question, a request for clarification, or a general query related to the conversation history:** Respond with a JSON object matching the 'response' type. This JSON should contain:
    - "type": "response"
    - "answer": A helpful plain text answer, considering the context from the "Previous interactions".

**Analyze the following:**

Current question: {{{question}}}

{{#if conversationHistory}}
**Previous interactions (for context if it's a follow-up):**
{{#each conversationHistory}}
User: {{{this.user}}}
Assistant: {{{this.assistant}}}
{{/each}}
{{else}}
**No previous interactions.**
{{/if}}

**Respond with JSON matching either the 'solution' or 'response' type based on your analysis.**`,
}); // Removed the incorrect second argument

// Define the Genkit flow using the updated schemas and prompt
export const answerFollowUpQuestionFlow = ai.defineFlow<
  typeof AnswerFollowUpQuestionInputSchema,
  typeof AnswerFollowUpQuestionOutputSchema // Use the union schema here
>(
  {
    name: 'answerFollowUpQuestionFlow', // Keep original name for consistency if needed elsewhere
    inputSchema: AnswerFollowUpQuestionInputSchema,
    outputSchema: AnswerFollowUpQuestionOutputSchema, // Use the union schema here
  },
  async (input) => {
    // Ensure history is passed correctly
    const history = input.conversationHistory?.map(h => ({
        user: h.user,
        // Pass the raw assistant response string as context
        assistant: h.assistant
    })) || [];

    const { output } = await prompt({
        question: input.question,
        conversationHistory: history
    });

    // The output should already conform to the union schema due to prompt configuration
    if (!output) {
      throw new Error('AI did not return a valid response.');
    }
    return output;
  }
);
