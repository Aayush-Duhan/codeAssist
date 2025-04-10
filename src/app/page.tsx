'use client';

import {useState} from 'react';
import {generateCodeSolution} from '@/ai/flows/generate-code-solution';
import {answerFollowUpQuestion} from '@/ai/flows/answer-follow-up-question';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {cn} from '@/lib/utils';

const placeholderAvatarUrl = `https://picsum.photos/50/50`;

export default function Home() {
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState<any>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    {user: string; assistant: string}[]
  >([]);

  const handleGenerateSolution = async () => {
    if (!problem) return;

    const generatedSolution = await generateCodeSolution({problem});
    setSolution(generatedSolution);
    setConversationHistory(prev => [
      ...prev,
      {user: problem, assistant: JSON.stringify(generatedSolution, null, 2)},
    ]);
  };

  const handleAnswerFollowUp = async () => {
    if (!followUpQuestion) return;

    const generatedAnswer = await answerFollowUpQuestion({
      question: followUpQuestion,
      conversationHistory,
    });

    setSolution(prev => ({
      ...prev,
      followUpAnswer: generatedAnswer.answer,
    }));

    setConversationHistory(prev => [
      ...prev,
      {user: followUpQuestion, assistant: generatedAnswer.answer},
    ]);
    setFollowUpQuestion('');
  };

  return (
    <div className="flex h-screen w-full">
      {/* Problem Input Section */}
      <div className="w-1/2 p-4 border-r">
        <Card>
          <CardHeader>
            <CardTitle>Coding Problem</CardTitle>
            <CardDescription>Enter a coding problem to generate a solution.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea
              placeholder="Describe the coding problem..."
              value={problem}
              onChange={e => setProblem(e.target.value)}
            />
            <Button onClick={handleGenerateSolution}>Generate Solution</Button>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Follow-up Question</CardTitle>
            <CardDescription>Ask a follow-up question about the solution.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea
              placeholder="Ask your question..."
              value={followUpQuestion}
              onChange={e => setFollowUpQuestion(e.target.value)}
            />
            <Button onClick={handleAnswerFollowUp} disabled={!solution}>
              Ask
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Solution Display Section */}
      <div className="w-1/2 p-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>AI Solution</CardTitle>
            <CardDescription>
              Here is the generated solution and follow-up answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto h-full">
            <ScrollArea className="h-[calc(100vh - 150px)]">
              {solution ? (
                <div className="space-y-4">
                  <div className="text-lg font-semibold">Problem Statement</div>
                  <div className="text-sm">{solution.problemStatement}</div>

                  <div className="text-lg font-semibold">Approach</div>
                  <div className="text-sm">{solution.approach}</div>

                  <div className="text-lg font-semibold">Code Snippet</div>
                  <div className="text-sm">
                    <pre className="bg-secondary p-2 rounded-md">
                      <code>{solution.codeSnippet}</code>
                    </pre>
                  </div>

                  <div className="text-lg font-semibold">Time Complexity</div>
                  <div className="text-sm">{solution.timeComplexity}</div>

                  <div className="text-lg font-semibold">Space Complexity</div>
                  <div className="text-sm">{solution.spaceComplexity}</div>

                  <div className="text-lg font-semibold">Dry Run</div>
                  <div className="text-sm">{solution.dryRun}</div>

                  <div className="text-lg font-semibold">Test Cases</div>
                  <div className="text-sm">
                    {solution.testCases?.map((testCase, index) => (
                      <div key={index} className="mb-2">
                        <div>
                          <span className="font-semibold">Input:</span> {testCase.input}
                        </div>
                        <div>
                          <span className="font-semibold">Output:</span> {testCase.output}
                        </div>
                      </div>
                    ))}
                  </div>
                  {solution.followUpAnswer && (
                    <>
                      <Separator className="my-4" />
                      <div className="text-lg font-semibold">Follow-up Answer</div>
                      <div className="text-sm">{solution.followUpAnswer}</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">No solution generated yet.</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
