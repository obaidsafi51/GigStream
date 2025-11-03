/**
 * Demo API Endpoints Test Script
 * Tests the demo simulator API endpoints
 * 
 * Tests:
 * 1. GET /api/v1/demo/status - Get demo environment status
 * 2. POST /api/v1/demo/complete-task - Execute demo payment flow
 * 3. POST /api/v1/demo/reset - Reset demo data
 * 
 * Prerequisites:
 * - Backend server running (npm run dev)
 * - Database seeded with demo data (npm run db:seed)
 * - Worker wallet created
 */

import { config } from 'dotenv';
config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test 1: Get Demo Status
 */
async function testDemoStatus() {
  logSection('Test 1: Get Demo Environment Status');

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/demo/status`);
    const data = await response.json();

    if (response.ok) {
      log('✅ Demo status retrieved successfully', 'green');
      console.log('Response:', JSON.stringify(data, null, 2));

      if (data.data.workers.length > 0) {
        log(`\n📊 Found ${data.data.workers.length} demo workers:`, 'blue');
        data.data.workers.forEach((worker) => {
          console.log(`  - ${worker.name} (ID: ${worker.id})`);
          console.log(`    Reputation: ${worker.reputation_score}`);
          console.log(`    Wallet: ${worker.wallet_address}\n`);
        });
      }

      return data.data.workers[0]?.id; // Return first worker ID for next test
    } else {
      log('❌ Failed to get demo status', 'red');
      console.log('Response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    log('❌ Error getting demo status', 'red');
    console.error(error.message);
    return null;
  }
}

/**
 * Test 2: Complete Demo Task
 */
async function testCompleteTask(workerId) {
  logSection('Test 2: Complete Demo Task & Process Payment');

  if (!workerId) {
    log('⚠️  Skipping test - no worker ID available', 'yellow');
    return null;
  }

  try {
    log('📤 Sending request to complete demo task...', 'blue');

    const payload = {
      workerId: workerId,
      taskType: 'fixed',
      amount: 25.50,
      description: 'Test demo task - Food delivery',
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/v1/demo/complete-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const endTime = Date.now();
    const duration = endTime - startTime;

    const data = await response.json();

    if (response.ok) {
      log(`✅ Demo task completed successfully in ${duration}ms`, 'green');
      console.log('\nResponse:', JSON.stringify(data, null, 2));

      // Display key information
      log('\n📋 Payment Details:', 'blue');
      console.log(`  Task ID: ${data.data.task.id}`);
      console.log(`  Amount: $${data.data.payment.amount.toFixed(2)}`);
      console.log(`  Fee: $${data.data.payment.fee.toFixed(2)}`);
      console.log(`  Net Amount: $${data.data.payment.netAmount.toFixed(2)}`);
      console.log(`  Status: ${data.data.payment.status}`);
      
      if (data.data.payment.txHash) {
        log(`\n⛓️  Blockchain Transaction:`, 'blue');
        console.log(`  TX Hash: ${data.data.payment.txHash}`);
        console.log(`  Explorer: ${data.data.blockchain.explorerUrl}`);
      }

      log(`\n👤 Worker Updated:`, 'blue');
      console.log(`  Name: ${data.data.worker.name}`);
      console.log(`  New Reputation: ${data.data.worker.reputationScore}`);

      // Check if payment was fast enough (<3 seconds)
      if (duration < 3000) {
        log(`\n⚡ Performance: Excellent! (target: <3s, actual: ${duration}ms)`, 'green');
      } else {
        log(`\n⚠️  Performance: Slower than target (target: <3s, actual: ${duration}ms)`, 'yellow');
      }

      return data.data.task.id; // Return task ID for verification
    } else {
      log('❌ Failed to complete demo task', 'red');
      console.log('Response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    log('❌ Error completing demo task', 'red');
    console.error(error.message);
    return null;
  }
}

/**
 * Test 3: Reset Demo Data
 */
async function testResetDemo() {
  logSection('Test 3: Reset Demo Data');

  try {
    log('📤 Sending reset request...', 'blue');

    const response = await fetch(`${API_BASE_URL}/api/v1/demo/reset`, {
      method: 'POST',
    });

    const data = await response.json();

    if (response.ok) {
      log('✅ Demo data reset successfully', 'green');
      console.log('Response:', JSON.stringify(data, null, 2));

      log('\n🧹 Cleanup Results:', 'blue');
      console.log(`  Deleted Transactions: ${data.data.deletedTransactions}`);
      console.log(`  Deleted Tasks: ${data.data.deletedTasks}`);
      console.log(`  Deleted Reputation Events: ${data.data.deletedReputationEvents}`);
      console.log(`  Reset Workers: ${data.data.resetWorkers}`);

      return true;
    } else {
      log('❌ Failed to reset demo data', 'red');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('❌ Error resetting demo data', 'red');
    console.error(error.message);
    return false;
  }
}

/**
 * Test 4: Verify Status After Reset
 */
async function testStatusAfterReset() {
  logSection('Test 4: Verify Status After Reset');

  await wait(500); // Wait for database to settle

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/demo/status`);
    const data = await response.json();

    if (response.ok) {
      log('✅ Status retrieved after reset', 'green');
      
      log('\n📊 Current Demo Stats:', 'blue');
      console.log(`  Demo Tasks: ${data.data.stats.demoTasks}`);
      console.log(`  Demo Transactions: ${data.data.stats.demoTransactions}`);
      console.log(`  Demo Workers: ${data.data.stats.demoWorkers}`);

      if (data.data.stats.demoTasks === 0 && data.data.stats.demoTransactions === 0) {
        log('\n✅ Reset successful - all demo data cleared', 'green');
      } else {
        log('\n⚠️  Some demo data still exists', 'yellow');
      }

      return true;
    } else {
      log('❌ Failed to get status after reset', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Error getting status after reset', 'red');
    console.error(error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  log('🚀 Demo API Endpoints Test Suite', 'cyan');
  log('Testing backend demo functionality for Task 10.2', 'cyan');
  console.log('Backend URL:', API_BASE_URL);
  console.log('\n');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Test 1: Get demo status
    const workerId = await testDemoStatus();
    if (workerId) {
      results.passed++;
    } else {
      results.failed++;
    }

    await wait(1000);

    // Test 2: Complete demo task
    const taskId = await testCompleteTask(workerId);
    if (taskId) {
      results.passed++;
    } else if (!workerId) {
      results.skipped++;
    } else {
      results.failed++;
    }

    await wait(1000);

    // Test 3: Reset demo data
    const resetSuccess = await testResetDemo();
    if (resetSuccess) {
      results.passed++;
    } else {
      results.failed++;
    }

    await wait(1000);

    // Test 4: Verify status after reset
    const verifySuccess = await testStatusAfterReset();
    if (verifySuccess) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Summary
    logSection('Test Results Summary');
    console.log(`Total Tests: ${results.passed + results.failed + results.skipped}`);
    log(`✅ Passed: ${results.passed}`, 'green');
    if (results.failed > 0) {
      log(`❌ Failed: ${results.failed}`, 'red');
    }
    if (results.skipped > 0) {
      log(`⚠️  Skipped: ${results.skipped}`, 'yellow');
    }

    const allPassed = results.failed === 0 && results.passed > 0;
    if (allPassed) {
      log('\n🎉 All tests passed! Demo API is working correctly.', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Please check the output above.', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    log('\n❌ Test suite failed with error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
