# Advance Request API - Quick Reference

**Date:** November 6, 2025  
**Version:** 1.0  
**Status:** Production Ready

---

## Base URL

```
http://localhost:8787/api/v1
```

---

## Authentication

All endpoints require JWT authentication:

```
Authorization: Bearer <access_token>
```

Get token from login endpoint:

```bash
POST /api/v1/auth/login
{
  "email": "worker@example.com",
  "password": "password123"
}
```

---

## Endpoints

### 1. Check Advance Eligibility

**GET** `/workers/:workerId/advance/eligibility`

**Description:** Check if worker is eligible for advance and calculate max amount.

**Response:**

```json
{
  "success": true,
  "data": {
    "eligible": true,
    "maxAdvanceAmount": 248.62,
    "feeRate": 300,
    "feePercentage": 3,
    "riskScore": {
      "score": 750,
      "eligible": true,
      "confidence": "medium",
      "algorithmUsed": "heuristic"
    },
    "earningsPrediction": {
      "next7Days": 310.78,
      "confidence": "medium",
      "safeAdvanceAmount": 248.62,
      "dailyPredictions": [...]
    },
    "checks": {
      "riskScoreCheck": {
        "passed": true,
        "value": 750,
        "threshold": 600,
        "description": "Risk score must be >= 600"
      },
      "predictedEarningsCheck": {
        "passed": true,
        "value": 310.78,
        "threshold": 50,
        "description": "Predicted 7-day earnings must be >= $50"
      },
      "noActiveLoansCheck": {
        "passed": true,
        "value": 0,
        "threshold": 0,
        "description": "Must have no active loans"
      },
      "accountAgeCheck": {
        "passed": true,
        "value": 180,
        "threshold": 7,
        "description": "Account must be >= 7 days old"
      },
      "completionRateCheck": {
        "passed": true,
        "value": 1,
        "threshold": 0.8,
        "description": "Completion rate must be >= 80%"
      }
    }
  }
}
```

---

### 2. Request Advance

**POST** `/workers/:workerId/advance`

**Description:** Request a micro-advance (auto-approved if eligible).

**Request Body:**

```json
{
  "amount": 50.0,
  "reason": "Emergency expense" // optional
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "loan": {
      "id": "uuid",
      "workerId": "uuid",
      "requestedAmount": 50.0,
      "approvedAmount": 50.0,
      "feeRate": 300,
      "feeAmount": 1.5,
      "totalDue": 51.5,
      "repaidAmount": 0,
      "repaymentProgress": {
        "tasksTarget": 5,
        "tasksCompleted": 0,
        "percentComplete": 0
      },
      "status": "disbursed",
      "approvedAt": "2025-11-06T12:00:00Z",
      "disbursedAt": "2025-11-06T12:00:01Z",
      "dueDate": "2025-12-06T12:00:00Z",
      "contractLoanId": null,
      "transactionHash": "0x..."
    },
    "metadata": {
      "processedInMs": 487,
      "autoApproved": true,
      "riskScore": 750,
      "predictedEarnings": 310.78
    }
  }
}
```

**Response (Error - Not Eligible):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_ELIGIBLE",
    "message": "Worker is not eligible for advance based on current criteria",
    "data": {
      "riskScore": 450,
      "riskScoreRequired": 600,
      "predictedEarnings": 35.0,
      "predictedEarningsRequired": 50,
      "accountAgeDays": 5,
      "accountAgeRequired": 7,
      "completionRate": 0.75,
      "completionRateRequired": 0.8
    }
  }
}
```

**Response (Error - Active Loan Exists):**

```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_LOAN_EXISTS",
    "message": "Worker already has an active loan. Only one loan allowed at a time.",
    "data": {
      "activeLoanId": "uuid",
      "activeLoanAmount": 75.0
    }
  }
}
```

**Response (Error - Amount Exceeds Limit):**

```json
{
  "success": false,
  "error": {
    "code": "AMOUNT_EXCEEDS_LIMIT",
    "message": "Requested amount exceeds maximum eligible advance of $248.62",
    "data": {
      "requestedAmount": 300,
      "maxAdvance": 248.62
    }
  }
}
```

---

### 3. Get Active Loan

**GET** `/workers/:workerId/loans/active`

**Description:** Get worker's active loan if one exists.

**Response (Active Loan Exists):**

```json
{
  "success": true,
  "data": {
    "hasActiveLoan": true,
    "loan": {
      "id": "uuid",
      "requestedAmount": 50.00,
      "approvedAmount": 50.00,
      "feeRate": 300,
      "feeAmount": 1.50,
      "totalDue": 51.50,
      "repaidAmount": 10.30,
      "remainingAmount": 41.20,
      "repaymentProgress": {
        "tasksTarget": 5,
        "tasksCompleted": 2,
        "percentComplete": 20.00,
        "amountPerTask": 10.30
      },
      "status": "active",
      "createdAt": "2025-11-06T12:00:00Z",
      "approvedAt": "2025-11-06T12:00:00Z",
      "disbursedAt": "2025-11-06T12:00:01Z",
      "dueDate": "2025-12-06T12:00:00Z",
      "contractLoanId": 1,
      "metadata": {...}
    }
  }
}
```

**Response (No Active Loan):**

```json
{
  "success": true,
  "data": {
    "hasActiveLoan": false,
    "loan": null
  }
}
```

---

### 4. Get All Loans

**GET** `/workers/:workerId/loans?status=active`

**Description:** Get all loans for a worker with optional status filter.

**Query Parameters:**

- `status` (optional): Filter by loan status (active, repaid, defaulted, etc.)

**Response:**

```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "uuid",
        "requestedAmount": 50.00,
        "approvedAmount": 50.00,
        "feeRate": 300,
        "feeAmount": 1.50,
        "totalDue": 51.50,
        "repaidAmount": 51.50,
        "remainingAmount": 0,
        "repaymentProgress": {
          "tasksTarget": 5,
          "tasksCompleted": 5,
          "percentComplete": 100,
          "amountPerTask": 10.30
        },
        "status": "repaid",
        "createdAt": "2025-11-01T12:00:00Z",
        "approvedAt": "2025-11-01T12:00:00Z",
        "disbursedAt": "2025-11-01T12:00:01Z",
        "dueDate": "2025-12-01T12:00:00Z",
        "repaidAt": "2025-11-05T15:30:00Z",
        "contractLoanId": 1,
        "metadata": {...}
      }
    ],
    "count": 1
  }
}
```

---

## Error Codes

| Code                       | Status | Description                               |
| -------------------------- | ------ | ----------------------------------------- |
| `WORKER_NOT_FOUND`         | 404    | Worker ID is invalid or not found         |
| `ACTIVE_LOAN_EXISTS`       | 400    | Worker already has an active loan         |
| `NOT_ELIGIBLE`             | 400    | Worker does not meet eligibility criteria |
| `INVALID_AMOUNT`           | 400    | Amount not in valid range ($1-$500)       |
| `AMOUNT_EXCEEDS_LIMIT`     | 400    | Amount exceeds maximum eligible advance   |
| `ADVANCE_REQUEST_FAILED`   | 500    | Internal server error during processing   |
| `FETCH_LOANS_FAILED`       | 500    | Error retrieving loan records             |
| `FETCH_ACTIVE_LOAN_FAILED` | 500    | Error retrieving active loan              |

---

## Eligibility Criteria

Worker must meet ALL 5 criteria:

1. **Risk Score >= 600**

   - Calculated by risk scoring engine (Task 5.2)
   - Based on completion rate, account age, task consistency, rating, disputes

2. **Predicted Earnings >= $50**

   - 7-day earnings prediction (Task 8.1)
   - Based on historical task completion data

3. **No Active Loans**

   - Only one loan allowed at a time
   - Previous loan must be fully repaid

4. **Account Age >= 7 days**

   - Account creation date check
   - Ensures minimum history

5. **Completion Rate >= 80%**
   - Total completed / (completed + cancelled)
   - Ensures reliable work history

---

## Fee Calculation

Fee rate is determined by risk score:

| Risk Score | Fee Rate (bps) | Fee Percentage |
| ---------- | -------------- | -------------- |
| 800-1000   | 200            | 2%             |
| 700-799    | 250            | 2.5%           |
| 600-699    | 300            | 3%             |
| 500-599    | 400            | 4%             |
| < 500      | 500            | 5%             |

**Example:**

- Amount: $100
- Risk Score: 750
- Fee Rate: 250 bps
- Fee Amount: $100 × 0.025 = $2.50
- Total Due: $100 + $2.50 = $102.50

---

## Repayment Schedule

- **Target:** 5 tasks
- **Rate:** 20% per task completion
- **Auto-deduction:** Yes (from task earnings)
- **Due Date:** 30 days from disbursement

**Example:**

- Total Due: $51.50
- Per Task: $51.50 / 5 = $10.30
- Task 1: -$10.30 (80% remaining)
- Task 2: -$10.30 (60% remaining)
- Task 3: -$10.30 (40% remaining)
- Task 4: -$10.30 (20% remaining)
- Task 5: -$10.30 (0% remaining, loan repaid)

---

## Performance Targets

| Metric                | Target  | Actual    |
| --------------------- | ------- | --------- |
| Eligibility Check     | < 1s    | ~87ms ✅  |
| Advance Request       | < 5s    | ~500ms ✅ |
| Active Loan Retrieval | < 200ms | ~50ms ✅  |
| Loan History          | < 200ms | ~80ms ✅  |

---

## Testing

### Quick Test Script

```bash
cd backend
node test-advance-request.mjs
```

### Manual cURL Examples

**1. Check Eligibility:**

```bash
curl -X GET http://localhost:8787/api/v1/workers/WORKER_ID/advance/eligibility \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Request Advance:**

```bash
curl -X POST http://localhost:8787/api/v1/workers/WORKER_ID/advance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00, "reason": "Emergency"}'
```

**3. Get Active Loan:**

```bash
curl -X GET http://localhost:8787/api/v1/workers/WORKER_ID/loans/active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Get All Loans:**

```bash
curl -X GET http://localhost:8787/api/v1/workers/WORKER_ID/loans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Integration

### React Example

```typescript
// Check eligibility
const checkEligibility = async (workerId: string, token: string) => {
  const response = await fetch(
    `/api/v1/workers/${workerId}/advance/eligibility`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.json();
};

// Request advance
const requestAdvance = async (
  workerId: string,
  amount: number,
  token: string
) => {
  const response = await fetch(`/api/v1/workers/${workerId}/advance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  return response.json();
};

// Get active loan
const getActiveLoan = async (workerId: string, token: string) => {
  const response = await fetch(`/api/v1/workers/${workerId}/loans/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
};
```

---

## Database Schema

### loans Table

```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  requested_amount_usdc NUMERIC(20,6) NOT NULL,
  approved_amount_usdc NUMERIC(20,6),
  fee_rate_bps INTEGER NOT NULL,
  fee_amount_usdc NUMERIC(20,6),
  total_due_usdc NUMERIC(20,6),
  repaid_amount_usdc NUMERIC(20,6) DEFAULT 0,
  repayment_tasks_target INTEGER DEFAULT 5,
  repayment_tasks_completed INTEGER DEFAULT 0,
  status loan_status DEFAULT 'pending',
  contract_loan_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  disbursed_at TIMESTAMP,
  due_date TIMESTAMP,
  repaid_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);
```

### Loan Status Enum

```sql
CREATE TYPE loan_status AS ENUM (
  'pending',
  'approved',
  'disbursed',
  'active',
  'repaying',
  'repaid',
  'defaulted',
  'cancelled'
);
```

---

## Support

For questions or issues:

- Check `summary/TASK_8.4_COMPLETED.md` for detailed documentation
- Run test suite: `node backend/test-advance-request.mjs`
- Review API logs in backend console

---

**Last Updated:** November 6, 2025  
**Author:** GigStream Backend Team  
**Version:** 1.0
