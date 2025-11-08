# GigStream Platform Demonstration Guide

This guide explains how to demonstrate the platform-side integration with GigStream. Since there is no UI for platforms, this entire workflow is done programmatically by simulating a platform's backend using `curl`.

This demonstration will show how a platform can:
1.  Register itself with GigStream.
2.  Receive an API key for authentication.
3.  Assign a new task to a specific worker.

---

### **Prerequisites**

*   The GigStream backend server must be running (`npm run dev` in the `backend` directory).
*   You have a demo worker available in the database (e.g., `alice@example.com`). You can ensure this by running the seed script (`npm run db:seed`).
*   You have a command-line tool like `jq` installed to easily extract values from JSON responses. This is optional but recommended.

---

### **Demonstration Steps**

Open a new terminal. These commands will interact directly with your running backend API.

#### **Step 1: Register a New Platform**

First, we'll register a new gig platform named "DemoCorp" and provide a webhook URL (for this demo, the URL can be a placeholder).

```bash
curl -X POST http://localhost:8787/platforms/register \
-H "Content-Type: application/json" \
-d '{
  "name": "DemoCorp",
  "webhookUrl": "https://democorp.com/webhooks"
}'
```

**Expected Response:**

The API will respond with the platform's details, including the crucial `apiKey`.

```json
{
  "success": true,
  "data": {
    "platform": {
      "id": "platform_...",
      "name": "DemoCorp",
      "apiKey": "GS-API-KEY_...", // <-- This is your API key
      "webhookUrl": "https://democorp.com/webhooks",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Copy the `apiKey` value.** You will need it for the next step.

#### **Step 2: Assign a New Task to a Worker**

Now, acting as "DemoCorp", we will assign a new task to our demo worker, Alice.

First, you need the `id` of the worker you want to assign the task to. You can get this from your database, but the seed script creates Alice with a known email. For the demo, let's assume you've looked up her ID. (A real platform would store this ID when the worker links their account).

Let's say Alice's worker ID is `worker_01J3Z...` (you would get this from the `workers` table in your database).

Replace `YOUR_API_KEY` with the key you copied from Step 1 and use a valid `workerId`.

```bash
# Replace YOUR_API_KEY and a valid worker_id from your database
curl -X POST http://localhost:8787/tasks \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_API_KEY" \
-d '{
  "workerId": "worker_...",
  "title": "Urgent: Design a new logo",
  "description": "Create a modern logo for a new startup.",
  "amount": 150.00,
  "taskType": "fixed"
}'
```

**Expected Response:**

The API will confirm that the task has been created successfully.

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task_...",
      "title": "Urgent: Design a new logo",
      "status": "pending",
      // ... other task details
    }
  }
}
```

#### **Step 3: Verify the Task in the Worker's Dashboard**

1.  Go to the GigStream frontend in your browser (**http://localhost:3000**).
2.  If you are not already logged in, log in as the worker you assigned the task to (e.g., `alice@example.com`).
3.  Navigate to the **"Active Tasks"** page.

You will see the new task, "Urgent: Design a new logo," appear at the top of the list.

---

### **Conclusion**

This workflow successfully demonstrates the platform side of the integration. You have shown how a third-party platform can securely and programmatically interact with GigStream to manage tasks for its workers, completing the end-to-end picture of how the entire ecosystem functions.
