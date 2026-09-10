import "dotenv/config";
import odbc from "msnodesqlv8";

import { ChatGroq } from "@langchain/groq";
import {
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

import readline from "readline/promises";
import {
  stdin as input,
  stdout as output,
} from "process";

// ============================================================
// 1. CONFIGURATION
// ============================================================

const DB_SERVER =
  process.env.DB_SERVER || "localhost";

const DB_PORT =
  process.env.DB_PORT || "1433";

const DB_NAME =
  process.env.DB_NAME || "AdventureWorks2025";

// This is the exact connection configuration that was
// successfully tested directly with msnodesqlv8.
//
// Windows Authentication is used through:
// Trusted_Connection=Yes

const DB_CONNECTION_STRING =
  `Driver={ODBC Driver 18 for SQL Server};` +
  `Server=${DB_SERVER},${DB_PORT};` +
  `Database=${DB_NAME};` +
  `Trusted_Connection=Yes;` +
  `TrustServerCertificate=Yes;`;

// ============================================================
// 2. GROQ / LANGCHAIN MODEL
// ============================================================

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0,
});

// ============================================================
// 3. DATABASE QUERY HELPER
// ============================================================

interface DatabaseRow {
  [key: string]: any;
}

function executeDatabaseQuery(
  query: string,
): Promise<DatabaseRow[]> {
  return new Promise((resolve, reject) => {
    odbc.query(
      DB_CONNECTION_STRING,
      query,
      (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(rows || []);
      },
    );
  });
}

// ============================================================
// 4. TEST DATABASE CONNECTION
// ============================================================

async function connectToDatabase(): Promise<void> {
  console.log(
    "Connecting to MS SQL Server...",
  );

  console.log(
    `Server: ${DB_SERVER}:${DB_PORT}`,
  );

  console.log(
    `Database: ${DB_NAME}`,
  );

  console.log(
    "Authentication: Windows Authentication",
  );

  console.log(
    "ODBC Driver: ODBC Driver 18 for SQL Server",
  );

  const result = await executeDatabaseQuery(`
    SELECT
      @@SERVERNAME AS ServerName,
      DB_NAME() AS DatabaseName,
      SUSER_SNAME() AS LoginName
  `);

  console.log(
    "Connected to MS SQL Server.",
  );

  console.log(
    `SQL Server: ${result[0]?.ServerName}`,
  );

  console.log(
    `Database: ${result[0]?.DatabaseName}`,
  );

  console.log(
    `Windows Login: ${result[0]?.LoginName}`,
  );
}

// ============================================================
// 5. GET DATABASE SCHEMA
// ============================================================

async function getDatabaseSchema(): Promise<string> {
  const result =
    await executeDatabaseQuery(`
      SELECT
          TABLE_SCHEMA,
          TABLE_NAME,
          COLUMN_NAME,
          DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY
          TABLE_SCHEMA,
          TABLE_NAME,
          ORDINAL_POSITION
    `);

  const schema: Record<
    string,
    string[]
  > = {};

  for (const row of result) {
    const table =
      `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`;

    if (!schema[table]) {
      schema[table] = [];
    }

    schema[table].push(
      `${row.COLUMN_NAME} (${row.DATA_TYPE})`,
    );
  }

  return Object.entries(schema)
    .map(([table, columns]) => {
      return (
        `TABLE ${table}\n` +
        `  ${columns.join("\n  ")}`
      );
    })
    .join("\n\n");
}

// ============================================================
// 6. GENERATE SQL FROM USER QUESTION
// ============================================================

async function generateSQL(
  question: string,
  schema: string,
): Promise<string> {
  const response = await llm.invoke([
    new SystemMessage(`
      You are an expert Microsoft SQL Server developer.

      Your job is to convert a user's natural-language question into ONE safe, read-only SQL Server query.

      DATABASE SCHEMA:
      ${schema}

      STRICT RULES:
        1. Generate SELECT queries only.
        2. Never generate INSERT, UPDATE, DELETE, MERGE, DROP, ALTER, CREATE, TRUNCATE or EXEC.
        3. Never access system databases.
        4. Use only tables and columns present in the schema.
        5. Use SQL Server syntax.
        6. Do not use markdown.
        7. Return ONLY the SQL query.
        8. If the question cannot be answered using the schema, return: CANNOT_ANSWER
        9. For questions asking for a limited number of rows, use TOP.
        10. Prefer explicit column names instead of SELECT *.
    `),

    new HumanMessage(question),
  ]);

  let generatedSQL =
    String(response.content).trim();

  // Remove accidental markdown fences.
  generatedSQL = generatedSQL
    .replace(/^```sql\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return generatedSQL;
}

// ============================================================
// 7. SAFETY CHECK
// ============================================================

function validateSQL(query: string): void {
  const normalized = query
    .replace(/--.*$/gm, "")
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .trim()
    .toUpperCase();

  if (normalized === "CANNOT_ANSWER") {
    return;
  }

  // Only allow SELECT / WITH queries.
  if (
    !normalized.startsWith("SELECT") &&
    !normalized.startsWith("WITH")
  ) {
    throw new Error(
      "Blocked: only SELECT queries are allowed.",
    );
  }

  const forbidden = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "MERGE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "EXEC",
    "EXECUTE",
    "GRANT",
    "REVOKE",
  ];

  for (const keyword of forbidden) {
    const regex =
      new RegExp(`\\b${keyword}\\b`);

    if (regex.test(normalized)) {
      throw new Error(
        `Blocked SQL keyword: ${keyword}`,
      );
    }
  }

  // Prevent multiple statements.
  const statements = normalized
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

  if (statements.length > 1) {
    throw new Error(
      "Blocked: multiple SQL statements are not allowed.",
    );
  }
}

// ============================================================
// 8. EXECUTE SQL
// ============================================================

async function executeSQL(
  query: string,
): Promise<DatabaseRow[]> {
  validateSQL(query);

  if (
    query.trim().toUpperCase() ===
    "CANNOT_ANSWER"
  ) {
    return [];
  }

  console.log("\nGenerated SQL:");
  console.log(query);

  const rows =
    await executeDatabaseQuery(query);

  return rows;
}

// ============================================================
// 9. SEND DATABASE RESULTS TO GROQ
// ============================================================

async function answerQuestion(
  question: string,
  sqlQuery: string,
  rows: DatabaseRow[],
): Promise<string> {
  const response = await llm.invoke([
    new SystemMessage(`
      You are a helpful data analyst.

      Answer the user's question using ONLY the SQL result provided below.

      Rules:
        1. Do not invent information.
        2. If the result is empty, clearly say that no matching records were found.
        3. Keep the answer concise but useful.
        4. You may calculate totals, averages, percentages, counts, etc. from the returned data.
        5. Do not mention internal implementation details unless the user asks.
        6. Format numbers and dates in a readable way.

      USER QUESTION:
      ${question}

      SQL QUERY:
      ${sqlQuery}

      DATABASE RESULT:
      ${JSON.stringify(rows, null, 2)}
    `),

    new HumanMessage(question),
  ]);

  return String(response.content);
}

// ============================================================
// 10. ASK A QUESTION
// ============================================================

async function askQuestion(
  question: string,
): Promise<void> {
  console.log(
    "\n----------------------------------------",
  );

  console.log(
    `Question: ${question}`,
  );

  try {
    // Get the current database schema.
    const schema =
      await getDatabaseSchema();

    // Ask Groq to generate SQL.
    const sqlQuery =
      await generateSQL(
        question,
        schema,
      );

    if (
      sqlQuery === "CANNOT_ANSWER"
    ) {
      console.log(
        "\nI cannot answer that question using the available database schema.",
      );

      return;
    }

    // Validate and execute generated SQL.
    const rows =
      await executeSQL(sqlQuery);

    console.log(
      `\nRows returned: ${rows.length}`,
    );

    // Ask Groq to turn the result into
    // a human-readable answer.
    const answer =
      await answerQuestion(
        question,
        sqlQuery,
        rows,
      );

    console.log(
      "\nAI Answer:",
    );

    console.log(answer);
  } catch (error: any) {
    console.error(
      "\nError:",
      error?.message || error,
    );
  }
}

// ============================================================
// 11. MAIN
// ============================================================

async function main() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "Missing GROQ_API_KEY environment variable.",
    );
  }

  // Test the database connection.
  await connectToDatabase();

  console.log(
    "GenAI SQL assistant is ready.",
  );

  const rl =
    readline.createInterface({
      input,
      output,
    });

  try {
    while (true) {
      const question =
        await rl.question(
          "\nAsk a question (type 'exit' to quit): ",
        );

      if (
        question
          .trim()
          .toLowerCase() === "exit"
      ) {
        break;
      }

      if (!question.trim()) {
        continue;
      }

      await askQuestion(question);
    }
  } finally {
    rl.close();
  }
}

// ============================================================
// 12. START APPLICATION
// ============================================================

main().catch((error) => {
  console.error(
    "\nApplication error:",
    error,
  );

  process.exit(1);
});