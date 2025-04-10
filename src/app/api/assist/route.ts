import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { answerFollowUpQuestionFlow } from '@/ai/flows/answer-follow-up-question'; // Import the modified flow

// Define the expected input schema for the API request body
const AssistInputSchema = z.object({
  user_id: z.string().uuid().describe('Unique identifier for the user.'),
  session_id: z.string().uuid().describe('Unique identifier for the conversation session.'),
  input: z.string().min(1).describe('The user query or problem description.'),
});

// Define the structure for conversation history entries from Supabase
interface ConversationHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

// Supabase client will be initialized inside the POST handler

export async function POST(request: Request) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validationResult = AssistInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { user_id, session_id, input } = validationResult.data;

    // Initialize Supabase client inside the handler
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or Key is missing in environment variables for this request.');
      return NextResponse.json({ error: 'Internal Server Error: Database configuration missing.' }, { status: 500 });
    }

    // Create Supabase client instance
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Although we check URL/Key above, keep this as a safeguard in case createClient fails silently (unlikely)
    // or if there are other initialization issues in the future.
    if (!supabase) {
        console.error('Failed to initialize Supabase client.');
        return NextResponse.json({ error: 'Internal Server Error: Database client initialization failed.' }, { status: 500 });
    }

    // 2. Fetch conversation history from Supabase
    let conversationHistory: ConversationHistoryEntry[] = [];
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('conversations') // Assuming your table is named 'conversations'
        .select('input, response') // Select user input and assistant response
        .eq('user_id', user_id)
        .eq('session_id', session_id)
        .order('timestamp', { ascending: false }) // Get the latest entries first
        .limit(5); // Limit to the last 5 interactions

      if (historyError) {
        throw historyError; // Throw to be caught by the outer try/catch
      }

      // Format history for the AI flow (mapping 'input' to 'user' and 'response' to 'assistant')
      // Reverse to maintain chronological order for the AI
      conversationHistory = (historyData || [])
        .reverse() // Reverse to get chronological order (oldest first)
        // Explicitly type the entry based on the Supabase select query
        .flatMap((entry: { input: string; response: string }) => [
          { role: 'user' as const, content: entry.input },
          { role: 'assistant' as const, content: entry.response }, // Pass the raw response string
        ]);

    } catch (dbError) {
      console.error('Supabase fetch error:', dbError);
      return NextResponse.json({ error: 'Internal Server Error: Failed to fetch conversation history.' }, { status: 500 });
    }

    // 3. Call the modified AI flow
    let aiResponse;
    try {
      // Map the fetched history to the format expected by the flow
      const flowHistory = conversationHistory.map(entry => ({
          user: entry.role === 'user' ? entry.content : '', // This mapping might need adjustment based on exact flow input needs
          assistant: entry.role === 'assistant' ? entry.content : '' // Pass raw assistant response
      })).filter(h => h.user || h.assistant); // Filter out potentially empty entries if mapping is strict


      // Filter history to match the flow's expected input structure more accurately
      // The flow expects { user: string, assistant: string } pairs.
      // We need to reconstruct this from the linear history.
      const flowInputHistory: { user: string; assistant: string }[] = [];
      for (let i = 0; i < conversationHistory.length; i += 2) {
          if (conversationHistory[i]?.role === 'user' && conversationHistory[i+1]?.role === 'assistant') {
              flowInputHistory.push({
                  user: conversationHistory[i].content,
                  assistant: conversationHistory[i+1].content // Pass the raw assistant response string
              });
          }
          // Handle cases where history might be incomplete or start with assistant (less likely)
      }


      aiResponse = await answerFollowUpQuestionFlow({
        question: input,
        conversationHistory: flowInputHistory, // Pass the correctly formatted history
      });
    } catch (aiError) {
      console.error('AI flow execution error:', aiError);
      return NextResponse.json({ error: 'Internal Server Error: AI processing failed.' }, { status: 500 });
    }

    // 4. Store the new interaction in Supabase
    try {
      // Store the user input and the raw AI response (JSON string or text)
      const rawAiResponse = JSON.stringify(aiResponse); // Store the full response object as a string

      const { error: insertError } = await supabase
        .from('conversations')
        .insert([
          {
            user_id: user_id,
            session_id: session_id,
            input: input,
            response: rawAiResponse, // Store the raw AI response
            // timestamp is likely handled by Supabase default value or trigger
          },
        ]);

      if (insertError) {
        throw insertError; // Throw to be caught by the outer try/catch
      }
    } catch (dbError) {
      // Log the error but proceed to return the AI response to the user
      console.error('Supabase insert error:', dbError);
      // Decide if this error should prevent returning the AI response.
      // For now, we'll log it and continue, but you might return 500 here in production.
      // return NextResponse.json({ error: 'Internal Server Error: Failed to save conversation.' }, { status: 500 });
    }

    // 5. Format and return the response based on AI output type
    if (aiResponse.type === 'solution') {
      // Exclude the 'type' field from the data returned to the client
      const { type, ...solutionData } = aiResponse;
      return NextResponse.json({ type: 'solution', data: solutionData }, { status: 200 });
    } else if (aiResponse.type === 'response') {
      return NextResponse.json({ type: 'response', text: aiResponse.answer }, { status: 200 });
    } else {
      // Should not happen if the AI flow schema is correct, but handle defensively
      console.error('Unknown AI response type:', (aiResponse as any).type);
      return NextResponse.json({ error: 'Internal Server Error: Unexpected AI response format.' }, { status: 500 });
    }

  } catch (error) {
    // General error handler for unexpected issues
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}