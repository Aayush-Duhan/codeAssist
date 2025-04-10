import { POST } from './route'; // Import the handler to test
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { answerFollowUpQuestionFlow } from '@/ai/flows/answer-follow-up-question'; // Import the flow to mock
import { SupabaseClient } from '@supabase/supabase-js'; // Import type for casting

// --- Mocking Dependencies ---

// Mock the Supabase client library
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock the AI flow
jest.mock('@/ai/flows/answer-follow-up-question', () => ({
  answerFollowUpQuestionFlow: jest.fn(),
}));

// Mock next/server's NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ // Return a mock response object for inspection
      json: () => Promise.resolve(body),
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      // Add other properties if needed by assertions, but keep it simple
    })),
  },
}));

// --- Type Casting Mocks ---
// Allows TypeScript to recognize the mocks with their original types + Jest mock methods
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedAnswerFlow = answerFollowUpQuestionFlow as jest.MockedFunction<typeof answerFollowUpQuestionFlow>;
const mockedNextResponseJson = NextResponse.json as jest.MockedFunction<typeof NextResponse.json>;

// --- Test Suite ---

describe('POST /api/assist API Route', () => {
  let mockRequest: Request;
  const mockUserId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; // Example UUID
  const mockSessionId = 'b2c3d4e5-f6a7-8901-2345-67890abcdef0'; // Example UUID
  const mockInput = 'How do I implement authentication in Next.js?';

  // Mock Supabase chainable query builders
  let mockSupabaseSelect: jest.Mock;
  let mockSupabaseInsert: jest.Mock;
  let mockSupabaseEq: jest.Mock;
  let mockSupabaseOrder: jest.Mock;
  let mockSupabaseLimit: jest.Mock;
  let mockSecondEq: jest.Mock; // Added for the second .eq() call
  let mockFrom: jest.Mock; // Mock for the 'from' function itself

  // Store original environment variables
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabaseKey = process.env.SUPABASE_KEY;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock environment variables required by the route
    process.env.SUPABASE_URL = 'mock-supabase-url';
    process.env.SUPABASE_KEY = 'mock-supabase-key';

    // Setup mock Supabase methods (Refined for accurate chaining)
    mockSupabaseInsert = jest.fn().mockResolvedValue({ data: [{}], error: null }); // For insert operations
    mockSupabaseLimit = jest.fn().mockResolvedValue({ data: [], error: null }); // Final call in fetch chain resolves

    // Define the objects returned by each step in the chain
    const limitReturn = mockSupabaseLimit; // limit() resolves the promise
    const orderReturn = { limit: limitReturn };
    const secondEqReturn = { order: jest.fn().mockReturnValue(orderReturn) };
    const firstEqReturn = { eq: jest.fn().mockReturnValue(secondEqReturn) }; // eq() returns object with the next eq()
    const selectReturn = { eq: jest.fn().mockReturnValue(firstEqReturn) }; // select() returns object with the first eq()

    // Mock the 'from' method to return the start of the chainable object
    const fromReturn = {
      select: jest.fn().mockReturnValue(selectReturn), // from().select() returns the object containing the first eq
      insert: mockSupabaseInsert,
    };

    // Assign the mocks to the top-level variables for potential assertions
    // These now reference the specific jest.fn() instances within the chain structure
    mockSupabaseSelect = fromReturn.select; // The function returned by from()
    mockSupabaseEq = selectReturn.eq; // The first eq function
    mockSecondEq = firstEqReturn.eq; // The second eq function
    mockSupabaseOrder = secondEqReturn.order; // The order function
    // mockSupabaseLimit is already assigned

    // Assign the mock for the 'from' function itself
    mockFrom = jest.fn().mockReturnValue(fromReturn);

    // Mock the createClient function to return our mock client structure
    mockedCreateClient.mockReturnValue({
      from: mockFrom, // Use the mock 'from' function
    } as any); // Use 'as any' for mock flexibility

    // Default successful Supabase insert is handled in the mockSupabaseInsert definition above.

    // Default successful AI flow response (type 'response')
    mockedAnswerFlow.mockResolvedValue({ type: 'response' as const, answer: 'Mock AI text response.' });

    // Create a mock Request object for POST
    mockRequest = {
      json: jest.fn().mockResolvedValue({
        user_id: mockUserId,
        session_id: mockSessionId,
        input: mockInput,
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
      // Add other Request properties if needed (e.g., method: 'POST')
    } as unknown as Request;
  });

  afterEach(() => {
    // Restore original environment variables
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_KEY = originalSupabaseKey;
  });

  // --- Test Cases ---

  it('should return 400 if request body is missing required fields', async () => {
    mockRequest.json = jest.fn().mockResolvedValue({ user_id: mockUserId, session_id: mockSessionId }); // Missing 'input'

    const response = await POST(mockRequest);
    const responseBody = await response.json(); // Read the body from the mock

    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid input' }),
      { status: 400 }
    );
    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid input');
  });

   it('should return 400 if input field is empty', async () => {
    mockRequest.json = jest.fn().mockResolvedValue({ user_id: mockUserId, session_id: mockSessionId, input: '' }); // Empty input

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid input' }),
      { status: 400 }
    );
     expect(response.status).toBe(400);
     expect(responseBody.error).toBe('Invalid input');
  });


  it('should return 500 if Supabase client cannot be initialized due to missing env vars', async () => {
    jest.resetModules(); // Reset modules to force re-import with new env state

    // Unset the environment variables *before* re-importing the handler
    process.env.SUPABASE_URL = undefined;
    process.env.SUPABASE_KEY = undefined;

    // Re-import the handler *after* resetting modules and unsetting env vars
    const { POST: POST_Handler_For_Test } = await import('./route');
// Re-import NextResponse to get the mock instance relevant to the re-imported handler
const { NextResponse: MockNextResponse } = await import('next/server');
const localMockedNextResponseJson = MockNextResponse.json as jest.MockedFunction<typeof NextResponse.json>;

// No need to mock createClient return value for this specific test case anymore,
// as the check happens before createClient is called within the re-imported handler.

const response = await POST_Handler_For_Test(mockRequest); // Use the re-imported handler
const responseBody = await response.json();

expect(localMockedNextResponseJson).toHaveBeenCalledTimes(1); // Use local mock
expect(localMockedNextResponseJson).toHaveBeenCalledWith( // Use local mock
    { error: 'Internal Server Error: Database client initialization failed.' }, // Corrected message
    { status: 500 }
);
expect(response.status).toBe(500);
expect(responseBody.error).toContain('Database client initialization failed'); // Corrected message check
  });


  it('should return 500 if fetching conversation history fails', async () => {
    const dbError = new Error('Supabase connection failed');
    // Simulate fetch error at the end of the chain (limit)
    mockSupabaseLimit.mockResolvedValue({ data: null, error: dbError });

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    expect(mockedCreateClient).toHaveBeenCalled();
    // Check the full chain was called correctly
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockSupabaseSelect).toHaveBeenCalledWith('input, response');
    expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId); // First eq
    expect(mockSecondEq).toHaveBeenCalledWith('session_id', mockSessionId); // Second eq
    expect(mockSupabaseOrder).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(mockSupabaseLimit).toHaveBeenCalledWith(5); // Final call
    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { error: 'Internal Server Error: Failed to fetch conversation history.' },
      { status: 500 }
    );
    expect(response.status).toBe(500);
    expect(responseBody.error).toContain('fetch conversation history');
  });

  it('should return 500 if the AI flow throws an error', async () => {
    const aiError = new Error('AI processing limit reached');
    mockedAnswerFlow.mockRejectedValue(aiError); // Simulate AI flow error

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    // Verify history fetch chain was called
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockSupabaseSelect).toHaveBeenCalledWith('input, response');
    expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId);
    expect(mockSecondEq).toHaveBeenCalledWith('session_id', mockSessionId);
    expect(mockSupabaseOrder).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(mockSupabaseLimit).toHaveBeenCalledWith(5);

    expect(mockedAnswerFlow).toHaveBeenCalledWith({
      question: mockInput,
      conversationHistory: [], // Expecting empty history based on default mock fetch
    });
    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { error: 'Internal Server Error: AI processing failed.' },
      { status: 500 }
    );
     expect(response.status).toBe(500);
     expect(responseBody.error).toContain('AI processing failed');
  });

  it('should return 200 and log error if saving conversation fails (insert error)', async () => {
    const insertError = new Error('Failed to insert row');
    mockSupabaseInsert.mockResolvedValue({ data: null, error: insertError }); // Simulate insert error

    // Spy on console.error to check if the error is logged
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockAiResult = { type: 'response' as const, answer: 'AI response despite DB error' };
    mockedAnswerFlow.mockResolvedValue(mockAiResult); // AI succeeds

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    // Verify history fetch chain was called
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockSupabaseSelect).toHaveBeenCalledWith('input, response');
    expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId);
    expect(mockSecondEq).toHaveBeenCalledWith('session_id', mockSessionId);
    expect(mockSupabaseOrder).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(mockSupabaseLimit).toHaveBeenCalledWith(5);

    expect(mockSupabaseInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: mockUserId,
        session_id: mockSessionId,
        input: mockInput,
        response: JSON.stringify(mockAiResult), // Ensure raw AI response was attempted to be stored
      }),
    ]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase insert error:', insertError);
    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    // Crucially, the API should still return 200 with the AI response
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { type: 'response', text: mockAiResult.answer },
      { status: 200 }
    );
    expect(response.status).toBe(200);
    expect(responseBody.text).toBe(mockAiResult.answer);

    consoleErrorSpy.mockRestore(); // Clean up the spy
  });

  it('should return 200 with type "solution" on successful execution', async () => {
    // Simulate existing conversation history
    // Simulate existing conversation history
    const mockHistory = [
      { input: 'Previous question', response: JSON.stringify({ type: 'response', answer: 'Previous answer' }) },
    ];
    // Mock the final step of the fetch chain to return history
    mockSupabaseLimit.mockResolvedValue({ data: mockHistory, error: null });

    // Simulate AI returning a 'solution' type
    const mockAiSolution = {
      type: 'solution' as const, // Use 'as const' for literal type
      problemStatement: 'Mock problem statement', // Placeholder
      approach: 'Mock approach description', // Placeholder
      codeSnippet: 'console.log("Solved!");', // Placeholder code
      timeComplexity: 'O(n)', // Placeholder
      spaceComplexity: 'O(1)', // Placeholder
      dryRun: 'Mock dry run steps', // Placeholder
      testCases: [{ input: 'mockInput', output: 'mockOutput' }], // Placeholder
      explanation: 'This code solves the problem.', // Placeholder explanation
    };
    mockedAnswerFlow.mockResolvedValue(mockAiSolution);

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    // Verify history fetch chain was called correctly
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockSupabaseSelect).toHaveBeenCalledWith('input, response');
    expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId);
    expect(mockSecondEq).toHaveBeenCalledWith('session_id', mockSessionId);
    expect(mockSupabaseOrder).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(mockSupabaseLimit).toHaveBeenCalledWith(5);

    // Verify AI flow call with formatted history
    expect(mockedAnswerFlow).toHaveBeenCalledWith({
      question: mockInput,
      conversationHistory: [ // History should be reversed by the route
        { user: 'Previous question', assistant: JSON.stringify({ type: 'response', answer: 'Previous answer' }) },
      ],
    });

    // Verify Supabase insert call
    expect(mockSupabaseInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: mockUserId,
        session_id: mockSessionId,
        input: mockInput,
        response: JSON.stringify(mockAiSolution), // Storing raw AI response
      }),
    ]);

    // Verify final response format
    // Prepare expected data, matching the structure returned by the API route for 'solution'
    const expectedData = {
        problemStatement: mockAiSolution.problemStatement,
        approach: mockAiSolution.approach,
        codeSnippet: mockAiSolution.codeSnippet,
        timeComplexity: mockAiSolution.timeComplexity,
        spaceComplexity: mockAiSolution.spaceComplexity,
        dryRun: mockAiSolution.dryRun,
        testCases: mockAiSolution.testCases,
        explanation: mockAiSolution.explanation,
    };
    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { type: 'solution', data: expectedData }, // Ensure the data structure matches API output
      { status: 200 }
    );
    expect(response.status).toBe(200);
    expect(responseBody.type).toBe('solution');
    expect(responseBody.data).toEqual(expectedData);
  });

  it('should return 200 with type "response" on successful execution', async () => {
    // Simulate empty history (default mock behavior for limit, but explicit check)
    mockSupabaseLimit.mockResolvedValue({ data: [], error: null });

    // AI returns 'response' type (already default mock, but explicit here)
    const mockAiResponse = { type: 'response' as const, answer: 'This is a simple text answer.' };
    mockedAnswerFlow.mockResolvedValue(mockAiResponse);

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    // Verify history fetch chain was called correctly
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockSupabaseSelect).toHaveBeenCalledWith('input, response');
    expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId);
    expect(mockSecondEq).toHaveBeenCalledWith('session_id', mockSessionId);
    expect(mockSupabaseOrder).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(mockSupabaseLimit).toHaveBeenCalledWith(5);

    // Verify AI flow call
    expect(mockedAnswerFlow).toHaveBeenCalledWith({
      question: mockInput,
      conversationHistory: [], // Empty history fetched
    });

    // Verify Supabase insert call
    expect(mockSupabaseInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        response: JSON.stringify(mockAiResponse),
      }),
    ]);

    // Verify final response format
    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { type: 'response', text: mockAiResponse.answer },
      { status: 200 }
    );
     expect(response.status).toBe(200);
     expect(responseBody.type).toBe('response');
     expect(responseBody.text).toBe(mockAiResponse.answer);
  });

  it('should correctly format and pass conversation history to the AI flow', async () => {
      const mockHistoryData = [
        // Supabase returns newest first, route reverses it
        { input: 'User Q2', response: JSON.stringify({ type: 'solution', code: 'code2' }) }, // newest
        { input: 'User Q1', response: JSON.stringify({ type: 'response', answer: 'Ans1' }) }, // oldest
     ];
     // Mock the fetch to return this data
     mockSupabaseLimit.mockResolvedValue({ data: mockHistoryData, error: null });

     await POST(mockRequest);

     // Verify history fetch chain was called correctly
     expect(mockFrom).toHaveBeenCalledWith('conversations');
     expect(mockSupabaseSelect).toHaveBeenCalledWith('input, response');
     expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId);
     expect(mockSecondEq).toHaveBeenCalledWith('session_id', mockSessionId);
     expect(mockSupabaseOrder).toHaveBeenCalledWith('timestamp', { ascending: false });
     expect(mockSupabaseLimit).toHaveBeenCalledWith(5);

      // Verify the history passed to the AI flow is reversed and formatted correctly
      // The route code transforms the flat history into {user, assistant} pairs
      expect(mockedAnswerFlow).toHaveBeenCalledWith(expect.objectContaining({
          conversationHistory: [
              { user: 'User Q1', assistant: JSON.stringify({ type: 'response', answer: 'Ans1' }) },
              { user: 'User Q2', assistant: JSON.stringify({ type: 'solution', code: 'code2' }) },
          ]
      }));
  });

});