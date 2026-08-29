````ts
// app.ts
//
// Install:
// npm install langchain @langchain/core @langchain/groq mssql typeorm dotenv
//
// Run with:
// npx tsx app.ts
//
// Environment variables:
// GROQ_API_KEY=your_groq_api_key
//
// DB_SERVER=localhost
// DB_PORT=1433
// DB_USER=sa
// DB_PASSWORD=your_password
// DB_NAME=YourDatabase
//
// Example:
// DB_ENCRYPT=false
// DB_TRUST_SERVER_CERTIFICATE=true

import "dotenv/config";
import sql from "mssql";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

// ============================================================
// 1. CONFIGURATION
// ============================================================

const DB_CONFIG: sql.config = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT || 1433),

  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,

  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// ============================================================
// 2. GROQ / LANGCHAIN MODEL
// ============================================================

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0,
});

// ============================================================
// 3. SQL CONNECTION
// ============================================================

let pool: sql.ConnectionPool;

// ============================================================
// 4. GET DATABASE SCHEMA
// ============================================================

async function getDatabaseSchema(): Promise<string> {
  const result = await pool.request().query(`
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

  const schema: Record<string, string[]> = {};

  for (const row of result.recordset) {
    const table = `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`;

    if (!schema[table]) {
      schema[table] = [];
    }

    schema[table].push(`${row.COLUMN_NAME} (${row.DATA_TYPE})`);
  }

  return Object.entries(schema)
    .map(([table, columns]) => {
      return `TABLE ${table}\n  ${columns.join("\n  ")}`;
    })
    .join("\n\n");
}

// ============================================================
// 5. GENERATE SQL FROM USER QUESTION
// ============================================================

async function generateSQL(question: string, schema: string): Promise<string> {
  const response = await llm.invoke([
    new SystemMessage(`
      You are an expert Microsoft SQL Server developer.

      Your job is to convert a user's natural-language question into ONE safe, read-only SQL Server query.

      DATABASE SCHEMA: ${schema}

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

  let generatedSQL = String(response.content).trim();

  // Remove accidental markdown fences.
  generatedSQL = generatedSQL
    .replace(/^```sql\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return generatedSQL;
}

// ============================================================
// 6. SAFETY CHECK
// ============================================================

function validateSQL(query: string): void {
  const normalized = query
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    .toUpperCase();

  if (normalized === "CANNOT_ANSWER") {
    return;
  }

  // Only allow SELECT / WITH queries.
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    throw new Error("Blocked: only SELECT queries are allowed.");
  }

  const forbidden = ["INSERT", "UPDATE", "DELETE", "MERGE", "DROP", "ALTER", "CREATE", "TRUNCATE", "EXEC", "EXECUTE", "GRANT", "REVOKE"];

  for (const keyword of forbidden) {
    const regex = new RegExp(`\\b${keyword}\\b`);

    if (regex.test(normalized)) {
      throw new Error(`Blocked SQL keyword: ${keyword}`);
    }
  }

  // Prevent multiple statements.
  const statements = normalized
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

  if (statements.length > 1) {
    throw new Error("Blocked: multiple SQL statements are not allowed.");
  }
}

// ============================================================
// 7. EXECUTE SQL
// ============================================================

async function executeSQL(query: string): Promise<any[]> {
  validateSQL(query);

  if (query.trim().toUpperCase() === "CANNOT_ANSWER") {
    return [];
  }

  console.log("\nGenerated SQL:");
  console.log(query);

  const result = await pool.request().query(query);

  return result.recordset;
}

// ============================================================
// 8. SEND DATABASE RESULTS TO GROQ
// ============================================================

async function answerQuestion(
  question: string,
  sqlQuery: string,
  rows: any[],
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

      USER QUESTION: ${question}

      SQL QUERY: ${sqlQuery}

      DATABASE RESULT: ${JSON.stringify(rows, null, 2)}
    `),
    new HumanMessage(question),
  ]);

  return String(response.content);
}

// ============================================================
// 9. ASK A QUESTION
// ============================================================

async function askQuestion(question: string): Promise<void> {
  console.log("\n----------------------------------------");
  console.log(`Question: ${question}`);

  try {
    const schema = await getDatabaseSchema();

    const sqlQuery = await generateSQL(question, schema);

    if (sqlQuery === "CANNOT_ANSWER") {
      console.log(
        "\nI cannot answer that question using the available database schema.",
      );
      return;
    }

    const rows = await executeSQL(sqlQuery);

    console.log(`\nRows returned: ${rows.length}`);

    const answer = await answerQuestion(question, sqlQuery, rows);

    console.log("\nAI Answer:");
    console.log(answer);
  } catch (error: any) {
    console.error("\nError:", error?.message || error);
  }
}

// ============================================================
// 10. MAIN
// ============================================================

async function main() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }

  if (!process.env.DB_USER) {
    throw new Error("Missing DB_USER environment variable.");
  }

  console.log("Connecting to MS SQL Server...");

  pool = await sql.connect(DB_CONFIG);

  console.log("Connected to MS SQL Server.");
  console.log("GenAI SQL assistant is ready.");

  const rl = readline.createInterface({
    input,
    output,
  });

  try {
    while (true) {
      const question = await rl.question(
        "\nAsk a question (type 'exit' to quit): ",
      );

      if (question.trim().toLowerCase() === "exit") {
        break;
      }

      if (!question.trim()) {
        continue;
      }

      await askQuestion(question);
    }
  } finally {
    rl.close();

    if (pool) {
      await pool.close();
    }
  }
}

main().catch((error) => {
  console.error("\nApplication error:", error);
  process.exit(1);
});
````

### `.env`

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxx

DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourPassword
DB_NAME=YourDatabase

DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### Install and run

```bash
npm install langchain @langchain/core @langchain/groq mssql typeorm dotenv

npm install -D typescript tsx @types/node

npx tsx app.ts
```

You can then ask things such as:

```text
How many customers do we have?

Show me the top 10 customers by total sales.

What was our revenue last month?

Which product generated the highest revenue?

How many orders were placed in 2026?

What is the average order value?
```

### How it works

```text
                    ┌─────────────────┐
                    │   User question │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Groq LLM    │
                    │    + LangChain  │
                    └────────┬────────┘
                             │
                       Generate SQL
                             │
                             ▼
                    ┌─────────────────┐
                    │  Safety Check   │
                    │  SELECT only    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   MS SQL Server │
                    └────────┬────────┘
                             │
                       Query results
                             │
                             ▼
                    ┌─────────────────┐
                    │     Groq LLM    │
                    │   + LangChain   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Natural language│
                    │     answer      │
                    └─────────────────┘
```

One important design choice here is that **you don't send the entire SQL database to Groq**. The first Groq call sees the schema and generates a query; SQL Server executes that query; then only the returned rows are sent to Groq for the final answer. That's much more scalable and avoids putting your entire database into the LLM context. LangChain's current SQL-agent documentation follows the same general pattern: inspect tables/schema, generate SQL, execute it, and formulate the answer.

`ChatGroq` is the current LangChain JavaScript integration and is installed with `@langchain/groq`; the current LangChain docs show `llama-3.3-70b-versatile` as an example model.

**For production**, I would make two changes: use a dedicated SQL Server user with **read-only permissions**, and add row limits/timeouts so an LLM-generated query cannot accidentally perform an expensive full-table operation.
