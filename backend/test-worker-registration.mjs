/**
 * Test script for Task 4.2: Worker Registration with Wallet Creation
 * Tests the POST /api/v1/auth/register endpoint with Circle wallet integration
 */

const API_BASE = 'http://localhost:8787/api/v1';

/**
 * Test worker registration
 */
async function testWorkerRegistration() {
  console.log('\n🧪 Testing Worker Registration with Wallet Creation');
  console.log('=' .repeat(60));

  const testWorker = {
    email: `test-worker-${Date.now()}@gigstream.test`,
    password: 'TestPassword123',
    name: 'Test Worker',
    type: 'worker',
  };

  console.log('\n📝 Registering new worker:');
  console.log(`   Email: ${testWorker.email}`);
  console.log(`   Name: ${testWorker.name}`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testWorker),
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`\n⏱️  Registration completed in ${elapsedTime}ms`);

    if (elapsedTime > 3000) {
      console.warn(`⚠️  Warning: Registration took ${elapsedTime}ms (target: <3s)`);
    } else {
      console.log(`✅ Performance target met (<3s)`);
    }

    const data = await response.json();

    console.log(`\n📊 Response status: ${response.status}`);

    if (response.ok) {
      console.log('\n✅ Registration successful!');
      console.log('\n👤 Worker details:');
      console.log(`   ID: ${data.data.user.id}`);
      console.log(`   Email: ${data.data.user.email}`);
      console.log(`   Name: ${data.data.user.name}`);
      console.log(`   Type: ${data.data.user.type}`);
      console.log(`   Reputation Score: ${data.data.user.reputationScore}`);
      
      if (data.data.user.walletAddress) {
        console.log(`\n💰 Wallet created:`);
        console.log(`   Address: ${data.data.user.walletAddress}`);
      } else {
        console.log('\n⏳ Wallet address pending generation...');
      }

      console.log(`\n🔑 Tokens received:`);
      console.log(`   Access Token: ${data.data.accessToken.substring(0, 20)}...`);
      console.log(`   Refresh Token: ${data.data.refreshToken.substring(0, 20)}...`);

      return {
        success: true,
        worker: data.data.user,
        accessToken: data.data.accessToken,
      };
    } else {
      console.log('\n❌ Registration failed!');
      console.log(`   Error Code: ${data.error.code}`);
      console.log(`   Error Message: ${data.error.message}`);
      if (data.error.details) {
        console.log(`   Details: ${data.error.details}`);
      }
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test duplicate email validation
 */
async function testDuplicateEmail() {
  console.log('\n🧪 Testing Duplicate Email Validation');
  console.log('=' .repeat(60));

  const duplicateWorker = {
    email: 'alice@example.com', // From seed data
    password: 'TestPassword123',
    name: 'Duplicate Worker',
    type: 'worker',
  };

  console.log('\n📝 Attempting to register with existing email:');
  console.log(`   Email: ${duplicateWorker.email}`);

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateWorker),
    });

    const data = await response.json();

    if (response.status === 409) {
      console.log('\n✅ Duplicate email correctly rejected!');
      console.log(`   Error Code: ${data.error.code}`);
      console.log(`   Error Message: ${data.error.message}`);
      return { success: true };
    } else {
      console.log(`\n❌ Unexpected response: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return { success: false };
    }
  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test weak password validation
 */
async function testWeakPassword() {
  console.log('\n🧪 Testing Weak Password Validation');
  console.log('=' .repeat(60));

  const testCases = [
    { password: 'short', message: 'Too short' },
    { password: 'nouppercase123', message: 'No uppercase' },
    { password: 'NOLOWERCASE123', message: 'No lowercase' },
    { password: 'NoNumbers', message: 'No numbers' },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.message}`);
    console.log(`   Password: "${testCase.password}"`);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@gigstream.test`,
          password: testCase.password,
          name: 'Test Worker',
          type: 'worker',
        }),
      });

      const data = await response.json();

      if (response.status === 400 && data.error.code === 'WEAK_PASSWORD') {
        console.log(`   ✅ Correctly rejected: ${data.error.message}`);
      } else {
        console.log(`   ❌ Unexpected response: ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      console.error(`   💥 Request failed: ${error.message}`);
      allPassed = false;
    }
  }

  return { success: allPassed };
}

/**
 * Test login with newly registered worker
 */
async function testLoginAfterRegistration(email, password) {
  console.log('\n🧪 Testing Login After Registration');
  console.log('=' .repeat(60));

  console.log('\n📝 Logging in with registered credentials:');
  console.log(`   Email: ${email}`);

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Login successful!');
      console.log(`   Worker ID: ${data.data.user.id}`);
      console.log(`   Wallet Address: ${data.data.user.walletAddress || 'Pending'}`);
      return { success: true };
    } else {
      console.log('\n❌ Login failed!');
      console.log(`   Error: ${data.error.message}`);
      return { success: false };
    }
  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🚀 Task 4.2: Worker Registration with Wallet Creation Tests');
  console.log('=' .repeat(60));
  console.log('API Endpoint: ' + API_BASE);
  console.log('Date: ' + new Date().toISOString());
  console.log('=' .repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Worker Registration
  const registrationResult = await testWorkerRegistration();
  results.tests.push({
    name: 'Worker Registration',
    passed: registrationResult.success,
  });
  if (registrationResult.success) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 2: Duplicate Email
  const duplicateResult = await testDuplicateEmail();
  results.tests.push({
    name: 'Duplicate Email Validation',
    passed: duplicateResult.success,
  });
  if (duplicateResult.success) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Weak Password
  const weakPasswordResult = await testWeakPassword();
  results.tests.push({
    name: 'Weak Password Validation',
    passed: weakPasswordResult.success,
  });
  if (weakPasswordResult.success) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: Login After Registration (if registration succeeded)
  if (registrationResult.success && registrationResult.worker) {
    const loginResult = await testLoginAfterRegistration(
      registrationResult.worker.email,
      'TestPassword123'
    );
    results.tests.push({
      name: 'Login After Registration',
      passed: loginResult.success,
    });
    if (loginResult.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  results.tests.forEach((test) => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });

  console.log('\n' + '-' .repeat(60));
  console.log(`Total: ${results.tests.length} tests`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('=' .repeat(60));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Task 4.2 completed successfully.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
