# A Complete Guide to Demonstrating GigStream

This guide will walk you through setting up the GigStream project and demonstrating its core feature: **real-time USDC payments for gig workers**. The demo uses a built-in simulation, so you will not need to integrate a live gig platform.

---

### **1. Prerequisites**

Before you begin, ensure you have the following installed:
*   **Node.js** (v18 or higher)
*   **Git**
*   **PostgreSQL** (v15 or higher). Alternatively, you can use Docker to run a PostgreSQL instance.

You will also need accounts and API keys from:
*   **Circle Developer Account:** To get an API key for making payments and creating wallets.
*   **Arc Testnet Access:** To get an RPC URL and deploy smart contracts.

---

### **2. Project Setup (Approx. 15 minutes)**

This phase involves cloning the code, installing dependencies, and configuring the environment.

#### **Step 2.1: Clone the Repository**
```bash
git clone https://github.com/obaidsafi51/GigStream.git
cd GigStream
```

#### **Step 2.2: Install All Dependencies**
Open three separate terminal windows and run the installation command in each respective directory.
```bash
# Terminal 1: Contracts
cd contracts && npm install

# Terminal 2: Backend
cd backend && npm install

# Terminal 3: Frontend
cd frontend && npm install
```

#### **Step 2.3: Configure Environment Variables**
You need to create and fill in `.env` files.
1.  **Backend:** In the `backend` directory, copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  **Edit `backend/.env`** and fill in the critical values:
    *   `DATABASE_URL`: Your PostgreSQL connection string. (e.g., `postgresql://user:pass@localhost:5432/gigstream_dev`)
    *   `CIRCLE_API_KEY`: Your API key from the Circle Developer console.
    *   `JWT_SECRET`: A long, random string for securing user sessions (e.g., `your-super-secret-key`).
    *   `ARC_RPC_URL`: The RPC endpoint for the Arc testnet.

#### **Step 2.4: Set Up the Database & Demo Data**
In the `backend` directory, run the following commands:
1.  **Create the database schema:** This command reads the schema and creates all the necessary tables.
    ```bash
    npm run db:push
    ```
2.  **Seed the database with demo data:** This is the most important step for the demo. It creates fake workers, platforms, and pre-assigned tasks.
    ```bash
    npm run db:seed
    ```

#### **Step 2.5: Deploy Smart Contracts**
In the `contracts` directory, deploy the contracts to the Arc testnet.
```bash
npm run deploy:testnet
```
After deployment, this script will output the addresses of the deployed contracts. **Copy these addresses and paste them into your `backend/.env` file** for the `CONTRACT_PAYMENT_STREAMING` and `CONTRACT_REPUTATION_LEDGER` variables.

---

### **3. Running the Application**

Now, start the backend and frontend servers in two separate terminals.

*   **Terminal 1: Start the Backend**
    Navigate to the `backend` directory and run:
    ```bash
    npm run dev
    ```
    The API server will start, typically on port 8787.

*   **Terminal 2: Start the Frontend**
    Navigate to the `frontend` directory and run:
    ```bash
    npm run dev
    ```
    The web application will be available at **http://localhost:3000**.

---

### **4. The Demonstration Workflow**

You are now ready to present the application.

#### **Step 4.1: Log In as a Demo Worker**
1.  Open your web browser to **http://localhost:3000**.
2.  Click "Login" and use the demo credentials created by the seed script:
    *   **Email:** `alice@example.com`
    *   **Password:** `demo123`

#### **Step 4.2: Explore the Worker Dashboard**
*   After logging in, you'll land on the dashboard.
*   **Point out the key metrics:** "Total Earnings," "USDC Balance," "Reputation Score," and the "Recent Transactions" list. Note their current values.

#### **Step 4.3: View Your Assigned Tasks**
1.  Navigate to the **"Active Tasks"** page from the sidebar.
2.  **Explain to your audience:** "These are tasks that have been pre-assigned to my worker profile, simulating jobs I've accepted on an external platform. Now, I'll complete one to get paid instantly."

#### **Step 4.4: Complete a Task & Get Paid in Real-Time**
1.  Choose any task from the list.
2.  Click the **"Mark Complete"** button.
3.  A notification will appear almost instantly, saying **"Task Completed!"** and confirming the payment amount.
4.  **Explain what just happened:** "In the background, the system just sent a real transaction on the Arc blockchain, transferring USDC directly to my wallet."

#### **Step 4.5: Verify the Results**
This is the "wow" moment of the demo.
1.  **Return to the Dashboard.** Show that the **"Total Earnings"** and **"USDC Balance"** have increased by the exact amount of the task you just completed.
2.  Go to the **"History"** page. The new transaction will be at the top of the list. Click on the transaction hash to open the Arc block explorer in a new tab, showing the immutable, on-chain proof of the payment.
3.  Go to the **"Reputation"** page. Show that the **Reputation Score** has increased, demonstrating the on-chain reputation update.

---
