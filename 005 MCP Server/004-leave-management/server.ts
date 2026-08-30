import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_FILE = join(__dirname, "leave_manager.db");

const mcp = new McpServer({
  name: "Leave Manager",
  version: "1.0.0",
});

type Employee = {
  employee_id: string;
  name: string;
  department: string;
  manager: string;
  annual_leave_balance: number;
  sick_leave_balance: number;
};

type LeaveRequest = {
  request_id: string;
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  reason: string;
  days_requested: number;
  submitted_date: string;
  approved_by: string | null;
};

function getDb(): Database.Database {
  return new Database(DB_FILE);
}

function initDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      employee_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      manager TEXT NOT NULL,
      annual_leave_balance INTEGER NOT NULL,
      sick_leave_balance INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      request_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      days_requested INTEGER NOT NULL,
      submitted_date TEXT NOT NULL,
      approved_by TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
    );
  `);

  const employeeCount = db
    .prepare("SELECT COUNT(*) AS count FROM employees")
    .get() as { count: number };

  if (employeeCount.count === 0) {
    const insertEmployee = db.prepare(`
      INSERT INTO employees
      (employee_id, name, department, manager, annual_leave_balance, sick_leave_balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const employees: Employee[] = [
      {
        employee_id: "EMP001",
        name: "John Smith",
        department: "Engineering",
        manager: "Jane Doe",
        annual_leave_balance: 25,
        sick_leave_balance: 10,
      },
      {
        employee_id: "EMP002",
        name: "Alice Johnson",
        department: "Marketing",
        manager: "Bob Wilson",
        annual_leave_balance: 20,
        sick_leave_balance: 10,
      },
      {
        employee_id: "EMP003",
        name: "Bob Wilson",
        department: "Marketing",
        manager: "Jane Doe",
        annual_leave_balance: 25,
        sick_leave_balance: 10,
      },
      {
        employee_id: "EMP004",
        name: "Sarah Davis",
        department: "HR",
        manager: "Jane Doe",
        annual_leave_balance: 22,
        sick_leave_balance: 11,
      },
      {
        employee_id: "EMP005",
        name: "Nick Chen",
        department: "Engineering",
        manager: "John Smith",
        annual_leave_balance: 18,
        sick_leave_balance: 10,
      },
    ];

    const insertManyEmployees = db.transaction((rows: Employee[]) => {
      for (const employee of rows) {
        insertEmployee.run(
          employee.employee_id,
          employee.name,
          employee.department,
          employee.manager,
          employee.annual_leave_balance,
          employee.sick_leave_balance,
        );
      }
    });

    insertManyEmployees(employees);

    const insertRequest = db.prepare(`
      INSERT INTO leave_requests (
        request_id, employee_id, employee_name, start_date, end_date,
        leave_type, status, reason, days_requested, submitted_date, approved_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const requests: LeaveRequest[] = [
      {
        request_id: "REQ001",
        employee_id: "EMP001",
        employee_name: "John Smith",
        start_date: "2024-07-01",
        end_date: "2024-07-05",
        leave_type: "annual",
        status: "approved",
        reason: "Family vacation",
        days_requested: 5,
        submitted_date: "2024-06-15",
        approved_by: "Jane Doe",
      },
      {
        request_id: "REQ002",
        employee_id: "EMP002",
        employee_name: "Alice Johnson",
        start_date: "2024-07-10",
        end_date: "2024-07-12",
        leave_type: "sick",
        status: "approved",
        reason: "Doctor appointment",
        days_requested: 3,
        submitted_date: "2024-07-09",
        approved_by: "Bob Wilson",
      },
      {
        request_id: "REQ003",
        employee_id: "EMP003",
        employee_name: "Bob Wilson",
        start_date: "2024-08-01",
        end_date: "2024-08-03",
        leave_type: "annual",
        status: "pending",
        reason: "Trip vacation",
        days_requested: 3,
        submitted_date: "2024-07-20",
        approved_by: null,
      },
      {
        request_id: "REQ004",
        employee_id: "EMP004",
        employee_name: "Sarah Davis",
        start_date: "2024-07-15",
        end_date: "2024-07-16",
        leave_type: "personal",
        status: "denied",
        reason: "Personal matters",
        days_requested: 2,
        submitted_date: "2024-07-10",
        approved_by: "Jane Doe",
      },
    ];

    const insertManyRequests = db.transaction((rows: LeaveRequest[]) => {
      for (const request of rows) {
        insertRequest.run(
          request.request_id,
          request.employee_id,
          request.employee_name,
          request.start_date,
          request.end_date,
          request.leave_type,
          request.status,
          request.reason,
          request.days_requested,
          request.submitted_date,
          request.approved_by,
        );
      }
    });

    insertManyRequests(requests);
  }

  db.close();
}

function loadEmployees(): Employee[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM employees").all() as Employee[];
  db.close();
  return rows;
}

function loadLeaveRequests(): LeaveRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM leave_requests").all() as LeaveRequest[];
  db.close();
  return rows;
}

function getEmployeeById(employeeId: string): Employee | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM employees WHERE employee_id = ?")
    .get(employeeId) as Employee | undefined;
  db.close();
  return row ?? null;
}

function getEmployeeByName(name: string): Employee | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM employees WHERE LOWER(name) = LOWER(?)")
    .get(name) as Employee | undefined;
  db.close();
  return row ?? null;
}

// Approximation of Python difflib.SequenceMatcher for fuzzy employee-name matching.
function similarity(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();

  if (left === right) return 1;

  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let i = 0; i <= left.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = matrix[left.length][right.length];
  return 1 - distance / Math.max(left.length, right.length, 1);
}

function findSimilarEmployees(name: string, threshold = 0.6): Employee[] {
  return loadEmployees()
    .map((employee) => ({
      employee,
      score: similarity(name, employee.name),
    }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ employee }) => employee);
}

function formatLeaveRequest(req: LeaveRequest): string {
  let result = "";
  result += `Request ID: ${req.request_id}\n`;
  result += `Employee: ${req.employee_name} (${req.employee_id})\n`;
  result += `Dates: ${req.start_date} to ${req.end_date}\n`;
  result += `Type: ${req.leave_type.charAt(0).toUpperCase() + req.leave_type.slice(1)}\n`;
  result += `Days: ${req.days_requested}\n`;
  result += `Status: ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}\n`;
  result += `Reason: ${req.reason}\n`;
  result += `Submitted: ${req.submitted_date}\n`;
  if (req.approved_by) {
    result += `Approved by: ${req.approved_by}\n`;
  }
  return result;
}

// Resources

mcp.registerResource(
  "all-employees",
  "employees://all",
  {
    title: "All Employees",
    description: "Get all employees and their leave balances",
    mimeType: "text/plain",
  },
  async (uri) => {
    const employees = loadEmployees();
    let result = "Employee Directory:\n\n";

    for (const employee of employees) {
      result += `ID: ${employee.employee_id}\n`;
      result += `Name: ${employee.name}\n`;
      result += `Department: ${employee.department}\n`;
      result += `Manager: ${employee.manager}\n`;
      result += `Annual Leave Balance: ${employee.annual_leave_balance} days\n`;
      result += `Sick Leave Balance: ${employee.sick_leave_balance} days\n`;
      result += `${"_".repeat(40)}\n`;
    }

    return {
      contents: [{ uri: uri.href, text: result }],
    };
  },
);

mcp.registerResource(
  "employee-info",
  new ResourceTemplate("employee://{employee_id}", { list: undefined }),
  {
    title: "Employee Information",
    description: "Get specific employee information and leave balance",
    mimeType: "text/plain",
  },
  async (uri, variables) => {
    const employeeId = String(variables.employee_id);
    const employee = getEmployeeById(employeeId);

    if (!employee) {
      return {
        contents: [{ uri: uri.href, text: `Employee ${employeeId} not found` }],
      };
    }

    const text = `Employee Information:
ID: ${employee.employee_id}
Name: ${employee.name}
Department: ${employee.department}
Manager: ${employee.manager}
Annual Leave Balance: ${employee.annual_leave_balance} days
Sick Leave Balance: ${employee.sick_leave_balance} days`;

    return {
      contents: [{ uri: uri.href, text }],
    };
  },
);

mcp.registerResource(
  "all-leave-requests",
  "leave-requests://all",
  {
    title: "All Leave Requests",
    description: "Get all leave requests",
    mimeType: "text/plain",
  },
  async (uri) => {
    const requests = loadLeaveRequests();
    let result = "All Leave Requests:\n\n";

    for (const request of requests) {
      result += `${formatLeaveRequest(request)}${"_".repeat(40)}\n`;
    }

    return {
      contents: [{ uri: uri.href, text: result }],
    };
  },
);

mcp.registerResource(
  "employee-leave-requests",
  new ResourceTemplate("leave-requests://employee/{employee_id}", {
    list: undefined,
  }),
  {
    title: "Employee Leave Requests",
    description: "Get leave requests for a specific employee",
    mimeType: "text/plain",
  },
  async (uri, variables) => {
    const employeeId = String(variables.employee_id);
    const db = getDb();

    const rows = db
      .prepare("SELECT * FROM leave_requests WHERE employee_id = ?")
      .all(employeeId) as LeaveRequest[];

    db.close();

    if (rows.length === 0) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `No leave requests found for employee ${employeeId}`,
          },
        ],
      };
    }

    let result = `Leave Requests for Employee ${employeeId}:\n\n`;
    for (const request of rows) {
      result += `${formatLeaveRequest(request)}${"_".repeat(40)}\n`;
    }

    return {
      contents: [{ uri: uri.href, text: result }],
    };
  },
);

mcp.registerResource(
  "leave-requests-by-status",
  new ResourceTemplate("leave-requests://status/{status}", {
    list: undefined,
  }),
  {
    title: "Leave Requests by Status",
    description: "Get leave requests by status: pending, approved, or denied",
    mimeType: "text/plain",
  },
  async (uri, variables) => {
    const status = String(variables.status);
    const db = getDb();

    const rows = db
      .prepare("SELECT * FROM leave_requests WHERE LOWER(status) = LOWER(?)")
      .all(status) as LeaveRequest[];

    db.close();

    if (rows.length === 0) {
      return {
        contents: [
          { uri: uri.href, text: `No ${status} leave requests found` },
        ],
      };
    }

    let result = `${status.charAt(0).toUpperCase() + status.slice(1)} Leave Requests:\n\n`;
    for (const request of rows) {
      result += `${formatLeaveRequest(request)}${"_".repeat(40)}\n`;
    }

    return {
      contents: [{ uri: uri.href, text: result }],
    };
  },
);

// Tools

mcp.registerTool(
  "submit_leave_request",
  {
    description: "Submit a new leave request",
    inputSchema: z.object({
      employee_id: z.string(),
      start_date: z.string(),
      end_date: z.string(),
      leave_type: z.string(),
      reason: z.string(),
      days_requested: z.number().int().positive(),
    }),
  },
  async ({
    employee_id,
    start_date,
    end_date,
    leave_type,
    reason,
    days_requested,
  }) => {
    const employee = getEmployeeById(employee_id);

    if (!employee) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Employee ${employee_id} not found`,
          },
        ],
      };
    }

    const validTypes = ["annual", "sick", "personal", "emergency"];
    const normalizedType = leave_type.toLowerCase();

    if (!validTypes.includes(normalizedType)) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid leave type. Must be one of: ${validTypes.join(", ")}`,
          },
        ],
      };
    }

    const db = getDb();

    try {
      const lastId = db
        .prepare(
          "SELECT request_id FROM leave_requests WHERE request_id LIKE 'REQ%' ORDER BY request_id DESC LIMIT 1",
        )
        .get() as { request_id: string } | undefined;

      const nextNum = lastId ? Number.parseInt(lastId.request_id.slice(3), 10) + 1 : 1;
      const requestId = `REQ${String(nextNum).padStart(3, "0")}`;

      db.prepare(`
        INSERT INTO leave_requests (
          request_id, employee_id, employee_name, start_date, end_date,
          leave_type, status, reason, days_requested, submitted_date, approved_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        requestId,
        employee_id,
        employee.name,
        start_date,
        end_date,
        normalizedType,
        "pending",
        reason,
        days_requested,
        new Date().toISOString().slice(0, 10),
        null,
      );

      return {
        content: [
          {
            type: "text",
            text: `Leave request (${requestId}) submitted successfully for ${employee.name}`,
          },
        ],
      };
    } finally {
      db.close();
    }
  },
);

mcp.registerTool(
  "approve_leave_request",
  {
    description: "Approve a pending leave request and update the employee leave balance",
    inputSchema: z.object({
      request_id: z.string(),
      approver_name: z.string(),
    }),
  },
  async ({ request_id, approver_name }) => {
    const db = getDb();

    try {
      const row = db
        .prepare("SELECT * FROM leave_requests WHERE request_id = ?")
        .get(request_id) as LeaveRequest | undefined;

      if (!row) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Leave request ${request_id} not found`,
            },
          ],
        };
      }

      if (row.status !== "pending") {
        return {
          content: [
            {
              type: "text",
              text: `Error: Leave request ${request_id} is already ${row.status}`,
            },
          ],
        };
      }

      const approve = db.transaction(() => {
        db.prepare(`
          UPDATE leave_requests
          SET status = 'approved', approved_by = ?
          WHERE request_id = ?
        `).run(approver_name, request_id);

        if (row.leave_type === "annual") {
          db.prepare(`
            UPDATE employees
            SET annual_leave_balance = MAX(0, annual_leave_balance - ?)
            WHERE employee_id = ?
          `).run(row.days_requested, row.employee_id);
        } else if (row.leave_type === "sick") {
          db.prepare(`
            UPDATE employees
            SET sick_leave_balance = MAX(0, sick_leave_balance - ?)
            WHERE employee_id = ?
          `).run(row.days_requested, row.employee_id);
        }
      });

      approve();

      return {
        content: [
          {
            type: "text",
            text: `Leave request ${request_id} approved by ${approver_name}`,
          },
        ],
      };
    } finally {
      db.close();
    }
  },
);

mcp.registerTool(
  "check_leave_balance",
  {
    description: "Check leave balance for an employee",
    inputSchema: z.object({
      employee_id: z.string(),
    }),
  },
  async ({ employee_id }) => {
    const employee = getEmployeeById(employee_id);

    if (!employee) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Employee ${employee_id} not found`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Leave Balance for ${employee.name} (${employee_id}):\n` +
            `Annual Leave: ${employee.annual_leave_balance} days remaining\n` +
            `Sick Leave: ${employee.sick_leave_balance} days remaining`,
        },
      ],
    };
  },
);

mcp.registerTool(
  "get_pending_approvals",
  {
    description: "Get all pending leave requests that need approval",
  },
  async () => {
    const db = getDb();

    try {
      const rows = db
        .prepare("SELECT * FROM leave_requests WHERE status = 'pending'")
        .all() as LeaveRequest[];

      if (rows.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No pending leave requests requiring approval",
            },
          ],
        };
      }

      let result = `Pending Leave Requests (${rows.length}):\n\n`;

      for (const request of rows) {
        result += `Request ID: ${request.request_id}\n`;
        result += `Employee: ${request.employee_name} (${request.employee_id})\n`;
        result += `Dates: ${request.start_date} to ${request.end_date}\n`;
        result += `Type: ${request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}\n`;
        result += `Days: ${request.days_requested}\n`;
        result += `Reason: ${request.reason}\n`;
        result += `Submitted: ${request.submitted_date}\n`;
        result += `${"_".repeat(40)}\n`;
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } finally {
      db.close();
    }
  },
);

mcp.registerTool(
  "get_database_stats",
  {
    description: "Get database statistics",
  },
  async () => {
    const db = getDb();

    try {
      const employeeCount = (
        db.prepare("SELECT COUNT(*) AS count FROM employees").get() as {
          count: number;
        }
      ).count;

      const totalRequests = (
        db.prepare("SELECT COUNT(*) AS count FROM leave_requests").get() as {
          count: number;
        }
      ).count;

      const pendingRequests = (
        db
          .prepare("SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'pending'")
          .get() as { count: number }
      ).count;

      const approvedRequests = (
        db
          .prepare("SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'approved'")
          .get() as { count: number }
      ).count;

      const deniedRequests = (
        db
          .prepare("SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'denied'")
          .get() as { count: number }
      ).count;

      const text =
        `Database Statistics:\n` +
        `Employees: ${employeeCount}\n` +
        `Total Leave Requests: ${totalRequests}\n` +
        `Pending Requests: ${pendingRequests}\n` +
        `Approved Requests: ${approvedRequests}\n` +
        `Denied Requests: ${deniedRequests}`;

      return {
        content: [{ type: "text", text }],
      };
    } finally {
      db.close();
    }
  },
);

mcp.registerTool(
  "add_employee",
  {
    description: "Add a new employee to the system with duplicate checking",
    inputSchema: z.object({
      name: z.string(),
      department: z.string(),
      manager: z.string(),
      annual_leave_balance: z.number().int().default(25),
      sick_leave_balance: z.number().int().default(10),
      force_create: z.boolean().default(false),
    }),
  },
  async ({
    name,
    department,
    manager,
    annual_leave_balance,
    sick_leave_balance,
    force_create,
  }) => {
    const existingEmployee = getEmployeeByName(name);

    if (existingEmployee && !force_create) {
      return {
        content: [
          {
            type: "text",
            text:
              `Employee with exact name '${name}' already exists:\n` +
              `ID: ${existingEmployee.employee_id}\n` +
              `Department: ${existingEmployee.department}\n` +
              `Manager: ${existingEmployee.manager}\n` +
              `If you want to create a new employee anyway, call this function again with force_create=true`,
          },
        ],
      };
    }

    if (!force_create) {
      const similarEmployees = findSimilarEmployees(name, 0.7);

      if (similarEmployees.length > 0) {
        let result = `Found employees with similar names to '${name}':\n`;

        for (const employee of similarEmployees.slice(0, 3)) {
          result +=
            `ID: ${employee.employee_id} | ` +
            `Name: ${employee.name} | ` +
            `Dept: ${employee.department}\n`;
        }

        result +=
          "\nDo you want to:\n" +
          "#1. Use an existing employee above, or\n" +
          "#2. Create new employee anyway by calling add_employee with force_create=True\n" +
          "#3. Cancel and choose a different name";

        return {
          content: [{ type: "text", text: result }],
        };
      }
    }

    const db = getDb();

    try {
      const lastId = db
        .prepare(
          "SELECT employee_id FROM employees WHERE employee_id LIKE 'EMP%' ORDER BY employee_id DESC LIMIT 1",
        )
        .get() as { employee_id: string } | undefined;

      const nextNum = lastId ? Number.parseInt(lastId.employee_id.slice(3), 10) + 1 : 1;
      const employeeId = `EMP${String(nextNum).padStart(3, "0")}`;

      db.prepare(`
        INSERT INTO employees (
          employee_id, name, department, manager,
          annual_leave_balance, sick_leave_balance
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        employeeId,
        name,
        department,
        manager,
        annual_leave_balance,
        sick_leave_balance,
      );

      const text =
        `New employee created successfully:\n` +
        `ID: ${employeeId}\n` +
        `Name: ${name}\n` +
        `Department: ${department}\n` +
        `Manager: ${manager}\n` +
        `Annual Leave Balance: ${annual_leave_balance} days\n` +
        `Sick Leave Balance: ${sick_leave_balance} days`;

      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating employee: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    } finally {
      db.close();
    }
  },
);

// Initialize the database before accepting MCP connections.
(async () => {
  initDatabase();
  await serveStdio(() => mcp);
})();
