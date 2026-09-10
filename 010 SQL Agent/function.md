# You can ask things such as:

- How many customers do we have?
- Show me the top 10 customers by total sales.
- What was our revenue last month?
- Which product generated the highest revenue?
- How many orders were placed in 2026?
- What is the average order value?

# How it works

```
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

One important design choice here is that **you don't send the entire SQL database to Groq**.

The first Groq call sees the schema and generates a query. SQL Server executes that query, then only the returned rows are sent to Groq for the final answer. That's much more scalable and avoids putting your entire database into the LLM context.

LangChain's current SQL-agent documentation follows the same general pattern: inspect tables/schema, generate SQL, execute it, and formulate the answer.

ChatGroq is the current LangChain JavaScript integration and is installed with @langchain/groq; the current LangChain docs show `openai/gpt-oss-120b` as an example model.

**For production**, make two changes:
- use a dedicated SQL Server user with **read-only permissions**, and
- add row limits/timeouts so an LLM-generated query cannot accidentally perform an expensive full-table operation.