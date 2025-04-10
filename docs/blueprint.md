# **App Name**: CodeAssistAI

## Core Features:

- Problem Input: Accept coding problem inputs (text, images, or both) preprocessed by the Electron frontend.
- AI Code Solution Generation: Generate structured responses for coding problems, including problem statement, approach, code snippet, complexity analysis, dry run, and test cases, using a large language model (Gemini or Claude).
- AI Follow-up Question Answering: Use LLM to generate a plain text response to follow-up questions, utilizing conversation history as a tool for context.
- Conversation Memory: Store and retrieve conversation history using Supabase to maintain context across interactions.

## Style Guidelines:

- Primary color: Dark blue (#24292F) for a professional look.
- Secondary color: Light gray (#F6F8FA) for backgrounds and contrast.
- Accent: Teal (#26A69A) for interactive elements and highlights.
- Clear and readable font for code snippets.
- Split-screen layout to display the problem and solution side by side.
- Simple and consistent icons for navigation and actions.

## Original User Request:
I want you to create the backend for a coding assistant desktop application using Node.js. The backend must integrate with Supabase for database management and use either Gemini or Claude as the large language model (LLM) to generate responses. The frontend, built with Electron, will preprocess user inputs (text, images, or both) into text and send them to the backend. Your task is to generate a complete Node.js backend implementation that meets the following requirements:

Features
Memory: Store and retrieve conversation history to maintain context across interactions.
Structured Output: For coding problems, return responses in JSON format with these fields: problemStatement, approach, codeSnippet, timeComplexity, spaceComplexity, dryRun, and testCases. For follow-ups or non-problem queries, return a plain text response.
Input Handling: Process text inputs representing coding problems (e.g., LeetCode-style questions) that may come from text, preprocessed images, or both.
Architecture
Use Express.js to handle API routes.
Use Supabase (PostgreSQL-based) to store conversation history.
Use Axios to call the Gemini or Claude API for LLM responses.
Assume the frontend sends requests to a POST /api/assist endpoint.
Database Schema (Supabase)
Create a table named conversations with:

id: SERIAL PRIMARY KEY
user_id: TEXT NOT NULL (user identifier)
session_id: TEXT NOT NULL (conversation session identifier)
input: TEXT NOT NULL (user input)
response: TEXT NOT NULL (LLM response as a JSON string)
timestamp: TIMESTAMPTZ DEFAULT NOW()
API Endpoint
Endpoint: POST /api/assist
Request Body:
json

Collapse

Wrap

Copy
{
  "user_id": "string",
  "session_id": "string",
  "input": "string"
}
Response: JSON with one of two formats:
For coding solutions:
json

Collapse

Wrap

Copy
{
  "type": "solution",
  "data": {
    "problemStatement": "string",
    "approach": "string",
    "codeSnippet": "string",
    "timeComplexity": "string",
    "spaceComplexity": "string",
    "dryRun": "string",
    "testCases": [
      {"input": "string", "output": "string"},
      {"input": "string", "output": "string"}
    ]
  }
}
For generalresponses:
json

Collapse

Wrap

Copy
{
  "type": "response",
  "text": "string"
}
Implementation Steps
Set up an Express.js server with a single POST /api/assist endpoint.
Connect to Supabase using the Supabase JavaScript client with environment variables for the URL and key.
For each request:
Retrieve the last 5 interactions from the conversations table for the given user_id and session_id, ordered by timestamp descending.
Build a prompt for the LLM that includes:
Instructions to return a JSON object with the specified fields for new coding problems.
Instructions to return a plain text response for follow-ups or non-problem queries.
The current user input.
Previous interactions (if any) for context.
Send the prompt to the Gemini or Claude API using Axios, including authentication via an API key from environment variables.
Parse the LLM response:
If it’s valid JSON with the solution fields, wrap it as { "type": "solution", "data": ... }.
Otherwise, wrap it as { "type": "response", "text": "..." }.
Store the input and response in the conversations table.
Return the structured JSON to the frontend.
Include basic error handling for Supabase queries and LLM API calls, returning a 500 status with an error message if something fails.
Prompt Example for LLM
The prompt sent to the LLM should look like:

text

Collapse

Wrap

Copy
You are a coding assistant. If the user is providing a new coding problem, respond with a JSON object containing:
- "problemStatement": A clear description of the problem.
- "approach": Explanation of how to solve it.
- "codeSnippet": A Python code example.
- "timeComplexity": Time complexity analysis.
- "spaceComplexity": Space complexity analysis.
- "dryRun": Step-by-step execution with an example.
- "testCases": At least two test cases (input and output pairs).

If the user is asking a follow-up question or something else, provide a helpful plain text response.

Current input: [user input here]

Previous interactions (if any):
[User: "previous input", Assistant: "previous response"]
...
Additional Requirements
Use environment variables (via a .env file and dotenv) to store sensitive data like Supabase URL, Supabase key, and LLM API key.
Listen on port 3000 and log a message when the server starts.
Ensure the backend can handle LeetCode-style problems (e.g., “Given an array of integers, find two numbers that add up to a target”).
Deliverables
Generate a complete Node.js backend implementation as a single file that:

Sets up the Express server.
Configures Supabase and Axios.
Implements the POST /api/assist endpoint with the described logic.
Includes error handling and environment variable usage.
Please provide the full implementation based on these instructions, ensuring it meets all specified requirements and produces structured output for coding problems or plain text for other queries.

This prompt is tailored to instruct an LLM to build the backend from scratch, providing all necessary details about the architecture, features, and implementation steps without including code directly in the prompt itself. You can feed this to an LLM like Claude or Gemini and expect it to generate a functional Node.js backend file.
  