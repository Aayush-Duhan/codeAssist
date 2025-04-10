// 'use server';
/**
 * @fileOverview Generates a structured solution for a given coding problem.
 *
 * - generateCodeSolution - A function that handles the generation of a code solution.
 * - GenerateCodeSolutionInput - The input type for the generateCodeSolution function.
 * - GenerateCodeSolutionOutput - The return type for the generateCodeSolution function.
 */

'use server';

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateCodeSolutionInputSchema = z.object({
  problem: z.string().describe('The coding problem to solve.'),
});
export type GenerateCodeSolutionInput = z.infer<typeof GenerateCodeSolutionInputSchema>;

const GenerateCodeSolutionOutputSchema = z.object({
  problemStatement: z.string().describe('A clear description of the problem.'),
  approach: z.string().describe('Explanation of how to solve the problem.'),
  codeSnippet: z.string().describe('A Python code example.'),
  timeComplexity: z.string().describe('Time complexity analysis.'),
  spaceComplexity: z.string().describe('Space complexity analysis.'),
  dryRun: z.string().describe('Step-by-step execution with an example.'),
  testCases: z
    .array(
      z.object({
        input: z.string().describe('Input for the test case.'),
        output: z.string().describe('Expected output for the test case.'),
      })
    )
    .describe('At least two test cases (input and output pairs).'),
});
export type GenerateCodeSolutionOutput = z.infer<typeof GenerateCodeSolutionOutputSchema>;

export async function generateCodeSolution(input: GenerateCodeSolutionInput): Promise<GenerateCodeSolutionOutput> {
  return generateCodeSolutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCodeSolutionPrompt',
  input: {
    schema: z.object({
      problem: z.string().describe('The coding problem to solve.'),
    }),
  },
  output: {
    schema: z.object({
      problemStatement: z.string().describe('A clear description of the problem.'),
      approach: z.string().describe('Explanation of how to solve the problem.'),
      codeSnippet: z.string().describe('A Python code example.'),
      timeComplexity: z.string().describe('Time complexity analysis.'),
      spaceComplexity: z.string().describe('Space complexity analysis.'),
      dryRun: z.string().describe('Step-by-step execution with an example.'),
      testCases: z
        .array(
          z.object({
            input: z.string().describe('Input for the test case.'),
            output: z.string().describe('Expected output for the test case.'),
          })
        )
        .describe('At least two test cases (input and output pairs).'),
    }),
  },
  prompt: `You are a coding assistant. The user is providing a new coding problem. Respond with a JSON object containing:\n- "problemStatement": A clear description of the problem.\n- "approach": Explanation of how to solve it.\n- "codeSnippet": A Python code example.\n- "timeComplexity": Time complexity analysis.\n- "spaceComplexity": Space complexity analysis.\n- "dryRun": Step-by-step execution with an example.\n- "testCases": At least two test cases (input and output pairs).\n\nProblem: {{{problem}}}`,
});

const generateCodeSolutionFlow = ai.defineFlow<
  typeof GenerateCodeSolutionInputSchema,
  typeof GenerateCodeSolutionOutputSchema
>({
  name: 'generateCodeSolutionFlow',
  inputSchema: GenerateCodeSolutionInputSchema,
  outputSchema: GenerateCodeSolutionOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
