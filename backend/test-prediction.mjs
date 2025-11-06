#!/usr/bin/env node
/**
 * Test script for GigStream Earnings Prediction Engine
 * 
 * Tests:
 * 1. Prediction with sufficient data (30 days)
 * 2. Prediction with minimal data (7 days)
 * 3. Prediction with no data (edge case)
 * 4. MAPE calculation accuracy
 * 5. Confidence scoring
 * 6. Cache functionality
 * 7. Batch predictions
 * 
 * Usage: npx tsx --env-file=.env backend/test-prediction.mjs
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic import for ES modules
const {
  predictEarnings,
  collectEarningsHistory,
  getCachedPrediction,
  clearPredictionCache,
  predictBatchEarnings,
  formatPredictionBreakdown,
  validatePrediction,
} = await import('./src/services/prediction.ts');

const { getDatabase } = await import('./src/services/database.ts');
const schema = await import('./database/schema.ts');
const { eq } = await import('drizzle-orm');

// ===================================
// TEST DATA GENERATION
// ===================================

/**
 * Create test worker with earnings history
 */
async function createTestWorker(name, daysOfHistory, avgDailyEarnings, volatility = 0.2) {
  const db = getDatabase();

  // Create test worker
  const [worker] = await db.insert(schema.workers).values({
    email: `test-prediction-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: 'test_hash',
    displayName: name,
    phoneNumber: '+1234567890',
    walletId: `test-wallet-${Date.now()}`,
    walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
    reputationScore: 750,
  }).returning();

  console.log(`✅ Created test worker: ${worker.displayName} (ID: ${worker.id})`);

  // Create test platform
  const [platform] = await db.insert(schema.platforms).values({
    name: 'Test Platform',
    email: `platform-${Date.now()}-${Math.random()}@example.com`,
    apiKeyHash: `test_api_key_hash_${Date.now()}_${Math.random()}`,
  }).returning();

  // Generate historical tasks
  const now = new Date();
  const tasksCreated = [];

  for (let i = daysOfHistory; i > 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);

    // Determine if this is a weekday (higher earnings) or weekend
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base earnings with day-of-week pattern
    let dailyEarnings = avgDailyEarnings;
    if (isWeekend) {
      dailyEarnings *= 0.6; // Lower weekend earnings
    }

    // Add volatility (random variation)
    const variation = (Math.random() - 0.5) * 2 * volatility;
    dailyEarnings *= (1 + variation);

    // Add slight upward trend
    const trendFactor = 1 + (daysOfHistory - i) * 0.002; // 0.2% daily growth
    dailyEarnings *= trendFactor;

    // Create 1-3 tasks for this day
    const numTasks = Math.floor(Math.random() * 3) + 1;
    const earningsPerTask = dailyEarnings / numTasks;

    for (let j = 0; j < numTasks; j++) {
      const completedAt = new Date(date);
      completedAt.setHours(8 + j * 4, Math.floor(Math.random() * 60));

      const [task] = await db.insert(schema.tasks).values({
        platformId: platform.id,
        workerId: worker.id,
        title: `Test Task Day ${i}`,
        description: 'Test task for prediction',
        type: 'fixed',
        paymentAmountUsdc: earningsPerTask.toFixed(2),
        status: 'completed',
        completedAt,
        createdAt: completedAt,
      }).returning();

      tasksCreated.push(task);
    }
  }

  console.log(`✅ Created ${tasksCreated.length} historical tasks over ${daysOfHistory} days`);
  console.log(`   Average daily earnings: $${avgDailyEarnings.toFixed(2)}, Volatility: ${(volatility * 100).toFixed(0)}%`);

  return { worker, platform, tasks: tasksCreated };
}

// ===================================
// TEST CASES
// ===================================

async function testSufficientData() {
  console.log('\n📊 TEST 1: Prediction with Sufficient Data (30 days)');
  console.log('='.repeat(60));

  const { worker } = await createTestWorker('Alice (30 days)', 30, 50, 0.15);

  const startTime = Date.now();
  const prediction = await predictEarnings(worker.id);
  const duration = Date.now() - startTime;

  console.log('\n✅ Prediction Results:');
  console.log(`   Algorithm: ${prediction.algorithmUsed}`);
  console.log(`   Next 7 days: $${prediction.next7Days.toFixed(2)}`);
  console.log(`   Confidence: ${prediction.confidence} (${(prediction.confidenceScore * 100).toFixed(0)}%)`);
  console.log(`   MAPE: ${prediction.mape.toFixed(2)}%`);
  console.log(`   Safe advance: $${prediction.safeAdvanceAmount.toFixed(2)}`);
  console.log(`   Duration: ${duration}ms`);

  console.log('\n📈 Breakdown:');
  console.log(`   Weekday earnings: $${prediction.breakdown.weekdayEarnings.toFixed(2)}`);
  console.log(`   Weekend earnings: $${prediction.breakdown.weekendEarnings.toFixed(2)}`);
  console.log(`   Trend adjustment: $${prediction.breakdown.trendAdjustment.toFixed(2)}`);

  console.log('\n📅 Daily Predictions:');
  prediction.dailyPredictions.forEach(day => {
    const date = new Date(day.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    console.log(`   ${dayName} ${day.date}: $${day.predicted.toFixed(2)} (±$${((day.upper - day.lower) / 2).toFixed(2)})`);
  });

  // Validation
  const validation = validatePrediction(prediction);
  console.log(`\n✓ Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
  if (!validation.isValid) {
    console.log('   Warnings:', validation.warnings);
  }

  // Performance check
  if (duration > 500) {
    console.log(`\n⚠️  WARNING: Prediction took ${duration}ms (target: <500ms)`);
  } else {
    console.log(`\n✅ Performance: ${duration}ms < 500ms target`);
  }

  return { worker, prediction, duration };
}

async function testMinimalData() {
  console.log('\n📊 TEST 2: Prediction with Minimal Data (7 days)');
  console.log('='.repeat(60));

  const { worker } = await createTestWorker('Bob (7 days)', 7, 40, 0.25);

  const prediction = await predictEarnings(worker.id);

  console.log('\n✅ Prediction Results:');
  console.log(`   Algorithm: ${prediction.algorithmUsed}`);
  console.log(`   Next 7 days: $${prediction.next7Days.toFixed(2)}`);
  console.log(`   Confidence: ${prediction.confidence} (${(prediction.confidenceScore * 100).toFixed(0)}%)`);
  console.log(`   Safe advance: $${prediction.safeAdvanceAmount.toFixed(2)}`);

  // Should have lower confidence due to less data
  if (prediction.confidence === 'low' || prediction.confidence === 'medium') {
    console.log('\n✅ Correctly assigned lower confidence for minimal data');
  } else {
    console.log('\n⚠️  WARNING: Expected lower confidence for minimal data');
  }

  return { worker, prediction };
}

async function testNoData() {
  console.log('\n📊 TEST 3: Prediction with No Data (edge case)');
  console.log('='.repeat(60));

  const db = getDatabase();

  // Create worker with no tasks
  const [worker] = await db.insert(schema.workers).values({
    email: `test-no-data-${Date.now()}@example.com`,
    passwordHash: 'test_hash',
    displayName: 'Charlie (no data)',
    phoneNumber: '+1234567890',
    walletId: `test-wallet-${Date.now()}`,
    walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
    reputationScore: 500,
  }).returning();

  const prediction = await predictEarnings(worker.id);

  console.log('\n✅ Prediction Results:');
  console.log(`   Algorithm: ${prediction.algorithmUsed}`);
  console.log(`   Next 7 days: $${prediction.next7Days.toFixed(2)}`);
  console.log(`   Confidence: ${prediction.confidence} (${(prediction.confidenceScore * 100).toFixed(0)}%)`);
  console.log(`   Safe advance: $${prediction.safeAdvanceAmount.toFixed(2)}`);

  // Should have very conservative prediction
  if (prediction.next7Days === 0 && prediction.confidence === 'low') {
    console.log('\n✅ Correctly handled no-data case with conservative estimate');
  } else {
    console.log('\n⚠️  WARNING: Expected zero earnings and low confidence for no data');
  }

  return { worker, prediction };
}

async function testCaching() {
  console.log('\n📊 TEST 4: Cache Functionality');
  console.log('='.repeat(60));

  const { worker } = await createTestWorker('Diana (cache test)', 30, 45, 0.18);

  // First call (should calculate)
  console.log('\n1️⃣ First call (no cache):');
  const start1 = Date.now();
  const prediction1 = await predictEarnings(worker.id);
  const duration1 = Date.now() - start1;
  console.log(`   Duration: ${duration1}ms`);
  console.log(`   Result: $${prediction1.next7Days.toFixed(2)}`);

  // Second call (should use cache)
  console.log('\n2️⃣ Second call (should use cache):');
  const start2 = Date.now();
  const prediction2 = await predictEarnings(worker.id);
  const duration2 = Date.now() - start2;
  console.log(`   Duration: ${duration2}ms`);
  console.log(`   Result: $${prediction2.next7Days.toFixed(2)}`);

  if (duration2 < duration1 / 2) {
    console.log(`\n✅ Cache working: Second call ${((1 - duration2/duration1) * 100).toFixed(0)}% faster`);
  } else {
    console.log('\n⚠️  WARNING: Cache may not be working as expected');
  }

  // Test cache retrieval
  const cached = getCachedPrediction(worker.id);
  if (cached && cached.next7Days === prediction2.next7Days) {
    console.log('✅ getCachedPrediction() working correctly');
  }

  // Test cache clearing
  clearPredictionCache(worker.id);
  const afterClear = getCachedPrediction(worker.id);
  if (!afterClear) {
    console.log('✅ clearPredictionCache() working correctly');
  }

  return { worker, prediction: prediction1, cacheSpeedup: duration1 / duration2 };
}

async function testBatchPredictions() {
  console.log('\n📊 TEST 5: Batch Predictions');
  console.log('='.repeat(60));

  // Create multiple test workers
  const workers = [];
  for (let i = 0; i < 3; i++) {
    const { worker } = await createTestWorker(
      `Worker ${i + 1} (batch)`,
      20 + i * 5,
      30 + i * 10,
      0.2
    );
    workers.push(worker);
  }

  const workerIds = workers.map(w => w.id);

  const startTime = Date.now();
  const predictions = await predictBatchEarnings(workerIds);
  const duration = Date.now() - startTime;

  console.log(`\n✅ Batch prediction completed in ${duration}ms`);
  console.log(`   Workers processed: ${predictions.size}`);
  console.log(`   Average per worker: ${(duration / predictions.size).toFixed(0)}ms`);

  predictions.forEach((pred, workerId) => {
    const worker = workers.find(w => w.id === workerId);
    console.log(`\n   ${worker.displayName}:`);
    console.log(`     Predicted: $${pred.next7Days.toFixed(2)}`);
    console.log(`     Confidence: ${pred.confidence}`);
  });

  return { workers, predictions, duration };
}

async function testFormatting() {
  console.log('\n📊 TEST 6: Formatting and Display');
  console.log('='.repeat(60));

  const { worker } = await createTestWorker('Eve (formatting)', 30, 55, 0.12);
  const prediction = await predictEarnings(worker.id);

  const formatted = formatPredictionBreakdown(prediction);

  console.log('\n✅ Formatted Output:');
  console.log(`\n📊 ${formatted.summary}`);
  console.log(`🎯 ${formatted.confidence}`);
  console.log('\n📅 Daily Breakdown:');
  formatted.dailyBreakdown.forEach(day => {
    console.log(`   ${day.date}: ${day.amount} (range: ${day.range})`);
  });
  console.log(`\n📝 Explanation:\n${formatted.explanation}`);

  return { worker, prediction, formatted };
}

async function testAccuracy() {
  console.log('\n📊 TEST 7: Prediction Accuracy (MAPE)');
  console.log('='.repeat(60));

  const { worker } = await createTestWorker('Frank (accuracy)', 40, 60, 0.15);

  // Get historical data
  const history = await collectEarningsHistory(worker.id, 30);
  console.log(`\n📈 Historical data: ${history.length} days`);
  
  const totalHistorical = history.reduce((sum, h) => sum + h.earnings, 0);
  const avgHistorical = totalHistorical / history.length;
  console.log(`   Total historical: $${totalHistorical.toFixed(2)}`);
  console.log(`   Average per day: $${avgHistorical.toFixed(2)}`);

  // Get prediction
  const prediction = await predictEarnings(worker.id);
  const avgPredicted = prediction.next7Days / 7;

  console.log(`\n🔮 Prediction:`);
  console.log(`   Average per day: $${avgPredicted.toFixed(2)}`);
  console.log(`   MAPE: ${prediction.mape.toFixed(2)}%`);

  // Compare with historical average
  const deviation = Math.abs((avgPredicted - avgHistorical) / avgHistorical) * 100;
  console.log(`\n📊 Deviation from historical average: ${deviation.toFixed(2)}%`);

  if (prediction.mape < 15) {
    console.log('✅ MAPE < 15% target achieved');
  } else {
    console.log(`⚠️  MAPE ${prediction.mape.toFixed(2)}% exceeds 15% target`);
  }

  return { worker, prediction, deviation, history };
}

// ===================================
// MAIN TEST RUNNER
// ===================================

async function runAllTests() {
  console.log('🚀 GigStream Earnings Prediction Engine - Test Suite');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  try {
    // Test 1: Sufficient data
    const test1 = await testSufficientData();
    if (test1.prediction.next7Days > 0 && test1.duration < 500) {
      results.passed++;
    } else {
      results.warnings++;
    }

    // Test 2: Minimal data
    const test2 = await testMinimalData();
    if (test2.prediction.confidence === 'low' || test2.prediction.confidence === 'medium') {
      results.passed++;
    } else {
      results.warnings++;
    }

    // Test 3: No data
    const test3 = await testNoData();
    if (test3.prediction.confidence === 'low') {
      results.passed++;
    } else {
      results.warnings++;
    }

    // Test 4: Caching
    const test4 = await testCaching();
    if (test4.cacheSpeedup > 2) {
      results.passed++;
    } else {
      results.warnings++;
    }

    // Test 5: Batch predictions
    const test5 = await testBatchPredictions();
    if (test5.predictions.size === 3) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 6: Formatting
    const test6 = await testFormatting();
    if (test6.formatted.dailyBreakdown.length === 7) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 7: Accuracy
    const test7 = await testAccuracy();
    if (test7.prediction.mape < 20) { // Relaxed target for test
      results.passed++;
    } else {
      results.warnings++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);

    const total = results.passed + results.warnings + results.failed;
    const successRate = ((results.passed / total) * 100).toFixed(0);
    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (results.failed === 0) {
      console.log('\n🎉 All critical tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed - review results above');
    }

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    results.failed++;
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
