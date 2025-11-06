#!/usr/bin/env node

/**
 * Task Verification Service Test Suite
 * 
 * Tests the AI-powered verification system with fraud detection.
 * 
 * Run: node backend/test-verification.mjs
 */

import { verifyTaskCompletion, getVerificationStats } from './src/services/verification.ts';

console.log('🧪 Testing Task Verification Service (Task 5.1)\n');
console.log('='.repeat(70));

// ============================================================================
// Test Data
// ============================================================================

const mockWorkerHistory = {
  reputationScore: 850,
  tasksLast24h: 5,
  averageTaskAmount: 30,
  disputes: 1,
  completionRate: 0.95,
  totalTasksCompleted: 127,
  accountAgeDays: 45,
  recentTasks: [
    {
      amount: 25,
      duration: 45,
      gps: { lat: 40.7128, lon: -74.0060 },
      completedAt: new Date('2025-11-05T10:00:00Z'),
    },
    {
      amount: 30,
      duration: 60,
      gps: { lat: 40.7130, lon: -74.0062 },
      completedAt: new Date('2025-11-04T14:00:00Z'),
    },
  ],
};

const allResults = [];

// ============================================================================
// Test 1: Valid Low-Value Task (Should Auto-Approve)
// ============================================================================

console.log('\n📋 Test 1: Valid Low-Value Task (Auto-Approve Scenario)');
console.log('-'.repeat(70));

const test1Task = {
  externalTaskId: 'TASK-12345',
  workerId: 'worker-test-uuid',
  completedAt: new Date().toISOString(),
  amount: 25,
  completionProof: {
    photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    gpsCoordinates: { lat: 40.7128, lon: -74.0060 },
    duration: 45,
  },
  rating: 5,
};

try {
  const result1 = await verifyTaskCompletion(test1Task, mockWorkerHistory);
  allResults.push(result1);
  
  console.log('✅ Verification Result:');
  console.log(`   Verdict: ${result1.verdict} (${result1.autoApprove ? 'AUTO-APPROVED' : 'requires review'})`);
  console.log(`   Confidence: ${result1.confidence}/100`);
  console.log(`   Latency: ${result1.latencyMs}ms`);
  console.log(`   Reason: ${result1.reason}`);
  console.log('\n   Checks:');
  console.log(`   - Fast-path: ${result1.checks.fastPath.passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (!result1.checks.fastPath.passed) {
    console.log(`     Issues: ${result1.checks.fastPath.issues.join(', ')}`);
  }
  console.log(`   - AI Score: ${result1.checks.ai.score}/100 (${result1.checks.ai.method})`);
  console.log(`   - Fraud Risk: ${result1.checks.fraud.riskLevel.toUpperCase()}`);
  if (result1.checks.fraud.signals.length > 0) {
    console.log(`     Signals: ${result1.checks.fraud.signals.slice(0, 3).join(', ')}`);
  }
  
  // Assertions
  if (result1.verdict !== 'approve' || !result1.autoApprove) {
    console.log('\n❌ FAILED: Expected auto-approval for valid low-value task');
  } else if (result1.latencyMs > 500) {
    console.log(`\n⚠️  WARNING: Latency ${result1.latencyMs}ms exceeds 500ms target`);
  } else {
    console.log('\n✅ PASSED: Task auto-approved within latency target');
  }
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// ============================================================================
// Test 2: High-Value Task (Should Flag for Review)
// ============================================================================

console.log('\n\n📋 Test 2: High-Value Task (Flag for Review)');
console.log('-'.repeat(70));

const test2Task = {
  externalTaskId: 'TASK-67890',
  workerId: 'worker-test-uuid',
  completedAt: new Date().toISOString(),
  amount: 600, // Above flag threshold
  completionProof: {
    photos: ['https://example.com/photo1.jpg'],
    gpsCoordinates: { lat: 40.7128, lon: -74.0060 },
    duration: 120,
  },
  rating: 5,
};

try {
  const result2 = await verifyTaskCompletion(test2Task, mockWorkerHistory);
  allResults.push(result2);
  
  console.log('✅ Verification Result:');
  console.log(`   Verdict: ${result2.verdict}`);
  console.log(`   Confidence: ${result2.confidence}/100`);
  console.log(`   Latency: ${result2.latencyMs}ms`);
  console.log(`   Reason: ${result2.reason}`);
  
  if (result2.verdict !== 'flag') {
    console.log('\n❌ FAILED: Expected high-value task to be flagged');
  } else {
    console.log('\n✅ PASSED: High-value task correctly flagged for review');
  }
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// ============================================================================
// Test 3: Suspicious Fast Completion (Fraud Detection)
// ============================================================================

console.log('\n\n📋 Test 3: Suspicious Fast Completion (Fraud Detection)');
console.log('-'.repeat(70));

const test3Task = {
  externalTaskId: 'TASK-FRAUD-1',
  workerId: 'worker-test-uuid',
  completedAt: new Date().toISOString(),
  amount: 50,
  completionProof: {
    photos: ['https://example.com/photo1.jpg'],
    gpsCoordinates: { lat: 40.7128, lon: -74.0060 },
    duration: 0.5, // Suspiciously fast
  },
  rating: 5,
};

try {
  const result3 = await verifyTaskCompletion(test3Task, mockWorkerHistory);
  allResults.push(result3);
  
  console.log('✅ Verification Result:');
  console.log(`   Verdict: ${result3.verdict}`);
  console.log(`   Confidence: ${result3.confidence}/100`);
  console.log(`   Fraud Risk: ${result3.checks.fraud.riskLevel.toUpperCase()}`);
  console.log(`   Fraud Signals: ${result3.checks.fraud.signals.length}`);
  if (result3.checks.fraud.signals.length > 0) {
    result3.checks.fraud.signals.forEach((signal, i) => {
      console.log(`     ${i + 1}. ${signal}`);
    });
  }
  
  if (result3.verdict === 'approve' && result3.checks.fraud.signals.length > 0) {
    console.log('\n⚠️  WARNING: Task with fraud signals was approved');
  } else {
    console.log('\n✅ PASSED: Fraud detection working correctly');
  }
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

// ============================================================================
// Test 4: Invalid Timestamp (Should Reject)
// ============================================================================

console.log('\n\n📋 Test 4: Invalid Timestamp (Validation Failure)');
console.log('-'.repeat(70));

const test4Task = {
  externalTaskId: 'TASK-INVALID-1',
  workerId: 'worker-test-uuid',
  completedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min in future
  amount: 25,
  completionProof: {
    photos: ['https://example.com/photo1.jpg'],
    gpsCoordinates: { lat: 40.7128, lon: -74.0060 },
    duration: 30,
  },
  rating: 5,
};

try {
  const result4 = await verifyTaskCompletion(test4Task, mockWorkerHistory);
  allResults.push(result4);
  
  console.log('✅ Verification Result:');
  console.log(`   Verdict: ${result4.verdict}`);
  console.log(`   Confidence: ${result4.confidence}/100`);
  console.log(`   Reason: ${result4.reason}`);
  console.log(`   Fast-path issues: ${result4.checks.fastPath.issues.join(', ')}`);
  
  if (result4.verdict !== 'reject') {
    console.log('\n❌ FAILED: Expected rejection for future timestamp');
  } else {
    console.log('\n✅ PASSED: Invalid timestamp correctly rejected');
  }
} catch (error) {
  console.error('❌ Test 4 failed:', error.message);
}

// ============================================================================
// Test 5: New Worker High-Risk Scenario
// ============================================================================

console.log('\n\n📋 Test 5: New Worker with High-Value Task');
console.log('-'.repeat(70));

const newWorkerHistory = {
  reputationScore: 100, // Default new worker score
  tasksLast24h: 0,
  averageTaskAmount: 0,
  disputes: 0,
  completionRate: 1,
  totalTasksCompleted: 2,
  accountAgeDays: 3, // Very new
  recentTasks: [],
};

const test5Task = {
  externalTaskId: 'TASK-NEW-WORKER',
  workerId: 'worker-new-uuid',
  completedAt: new Date().toISOString(),
  amount: 150,
  completionProof: {
    photos: ['https://example.com/photo1.jpg'],
    duration: 60,
  },
  rating: 5,
};

try {
  const result5 = await verifyTaskCompletion(test5Task, newWorkerHistory);
  allResults.push(result5);
  
  console.log('✅ Verification Result:');
  console.log(`   Verdict: ${result5.verdict}`);
  console.log(`   Confidence: ${result5.confidence}/100`);
  console.log(`   Fraud Risk: ${result5.checks.fraud.riskLevel.toUpperCase()}`);
  console.log(`   Fraud Signals: ${result5.checks.fraud.signals.join(', ')}`);
  
  if (result5.verdict === 'approve') {
    console.log('\n⚠️  WARNING: New worker with high-value task was auto-approved');
  } else {
    console.log('\n✅ PASSED: New worker scenario handled appropriately');
  }
} catch (error) {
  console.error('❌ Test 5 failed:', error.message);
}

// ============================================================================
// Test 6: Multiple Tasks from Same Location (Location Farming)
// ============================================================================

console.log('\n\n📋 Test 6: Location Farming Detection');
console.log('-'.repeat(70));

const locationFarmingHistory = {
  ...mockWorkerHistory,
  recentTasks: Array(15).fill(null).map((_, i) => ({
    amount: 25,
    duration: 30,
    gps: { lat: 40.7128, lon: -74.0060 }, // Same exact location
    completedAt: new Date(Date.now() - i * 60 * 60 * 1000),
  })),
};

const test6Task = {
  externalTaskId: 'TASK-LOCATION-FARM',
  workerId: 'worker-test-uuid',
  completedAt: new Date().toISOString(),
  amount: 25,
  completionProof: {
    photos: ['https://example.com/photo1.jpg'],
    gpsCoordinates: { lat: 40.7128, lon: -74.0060 }, // Same location
    duration: 30,
  },
  rating: 5,
};

try {
  const result6 = await verifyTaskCompletion(test6Task, locationFarmingHistory);
  allResults.push(result6);
  
  console.log('✅ Verification Result:');
  console.log(`   Verdict: ${result6.verdict}`);
  console.log(`   Confidence: ${result6.confidence}/100`);
  console.log(`   Fraud Risk: ${result6.checks.fraud.riskLevel.toUpperCase()}`);
  console.log(`   Fraud Signals: ${result6.checks.fraud.signals.length}`);
  if (result6.checks.fraud.signals.length > 0) {
    result6.checks.fraud.signals.forEach((signal, i) => {
      console.log(`     ${i + 1}. ${signal}`);
    });
  }
  
  const hasLocationSignal = result6.checks.fraud.signals.some(s => s.includes('same location'));
  if (!hasLocationSignal) {
    console.log('\n⚠️  WARNING: Location farming not detected');
  } else {
    console.log('\n✅ PASSED: Location farming detected');
  }
} catch (error) {
  console.error('❌ Test 6 failed:', error.message);
}

// ============================================================================
// Summary Statistics
// ============================================================================

console.log('\n\n' + '='.repeat(70));
console.log('📊 Verification Statistics Summary');
console.log('='.repeat(70));

if (allResults.length > 0) {
  const stats = getVerificationStats(allResults);
  
  console.log(`\nTotal Verifications: ${stats.totalVerifications}`);
  console.log(`Auto-Approval Rate: ${stats.autoApprovalRate.toFixed(1)}%`);
  console.log(`Average Latency: ${stats.averageLatency.toFixed(0)}ms`);
  console.log(`Fraud Detection Rate: ${stats.fraudDetectionRate.toFixed(1)}%`);
  
  console.log('\nVerdict Breakdown:');
  console.log(`  ✅ Approved: ${stats.verdictBreakdown.approve} (${(stats.verdictBreakdown.approve / stats.totalVerifications * 100).toFixed(1)}%)`);
  console.log(`  🔍 Flagged: ${stats.verdictBreakdown.flag} (${(stats.verdictBreakdown.flag / stats.totalVerifications * 100).toFixed(1)}%)`);
  console.log(`  ❌ Rejected: ${stats.verdictBreakdown.reject} (${(stats.verdictBreakdown.reject / stats.totalVerifications * 100).toFixed(1)}%)`);
  
  console.log('\nPerformance Metrics:');
  console.log(`  ⏱️  Fastest: ${Math.min(...allResults.map(r => r.latencyMs))}ms`);
  console.log(`  ⏱️  Slowest: ${Math.max(...allResults.map(r => r.latencyMs))}ms`);
  console.log(`  ⏱️  Target: <500ms for auto-approved tasks`);
  
  const slowTests = allResults.filter(r => r.latencyMs > 500);
  if (slowTests.length > 0) {
    console.log(`\n⚠️  ${slowTests.length} test(s) exceeded latency target`);
  } else {
    console.log('\n✅ All tests met latency requirement (<500ms)');
  }
  
  // Acceptance Criteria Check
  console.log('\n' + '='.repeat(70));
  console.log('🎯 Acceptance Criteria Validation');
  console.log('='.repeat(70));
  
  const autoApprovalTarget = 90;
  const latencyTarget = 500;
  const falsePositiveTarget = 2;
  const fraudAccuracyTarget = 95;
  
  console.log(`\n✓ Verification latency <500ms: ${allResults.every(r => r.latencyMs < latencyTarget) ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Auto-approval rate >90%: ${stats.autoApprovalRate >= autoApprovalTarget ? '✅ PASS' : `⚠️  ${stats.autoApprovalRate.toFixed(1)}%`}`);
  console.log(`✓ False positive rate <2%: ⚠️  NEEDS PRODUCTION DATA`);
  console.log(`✓ Fraud detection accuracy >95%: ⚠️  NEEDS PRODUCTION DATA`);
  
  console.log('\n📝 Note: False positive and fraud accuracy metrics require production data collection.');
}

console.log('\n' + '='.repeat(70));
console.log('✅ Task 5.1 Verification Test Suite Complete!');
console.log('='.repeat(70));
console.log('\nNext Steps:');
console.log('1. Test with live webhook: POST /api/v1/webhooks/task-completed');
console.log('2. Monitor verification latency in production');
console.log('3. Collect metrics for auto-approval and false positive rates');
console.log('4. Optional: Integrate Cloudflare Workers AI for enhanced detection');
console.log('\n');
