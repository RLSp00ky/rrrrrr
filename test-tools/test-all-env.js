require('dotenv').config({ path: '../.env' });

console.log('🔍 Comprehensive Environment Variable Test');
console.log('==========================================');

const tests = [];

// Test 1: Basic environment variables loading
function testBasicEnvLoading() {
  console.log('\n1. Testing basic environment variable loading...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'TURN_USERNAME',
    'TURN_CREDENTIAL',
    'TEST_USER_1_EMAIL',
    'TEST_USER_1_PASSWORD',
    'TEST_USER_2_EMAIL',
    'TEST_USER_2_PASSWORD',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      const maskedValue = varName.includes('PASSWORD') || varName.includes('KEY') 
        ? process.env[varName].substring(0, 8) + '...' 
        : process.env[varName];
      console.log(`   ✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
      allPresent = false;
    }
  });
  
  tests.push({
    name: 'Basic Environment Loading',
    passed: allPresent,
    details: `${requiredVars.length} variables checked`
  });
  
  return allPresent;
}

// Test 2: Database configuration
async function testDatabaseConfig() {
  console.log('\n2. Testing database configuration...');
  
  try {
    const { supabaseClient } = require('../database-config.js');
    
    if (supabaseClient) {
      console.log('   ✅ Database client created successfully');
      tests.push({
        name: 'Database Configuration',
        passed: true,
        details: 'Supabase client created with environment variables'
      });
      return true;
    } else {
      console.log('   ❌ Failed to create database client');
      tests.push({
        name: 'Database Configuration',
        passed: false,
        details: 'Failed to create Supabase client'
      });
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Database configuration error: ${error.message}`);
    tests.push({
      name: 'Database Configuration',
      passed: false,
      details: error.message
    });
    return false;
  }
}

// Test 3: Server endpoint (if server is running)
async function testServerEndpoint() {
  console.log('\n3. Testing server endpoint...');
  
  const http = require('http');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/env-config',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const config = JSON.parse(data);
          if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
            console.log('   ✅ Server endpoint working correctly');
            tests.push({
              name: 'Server Endpoint',
              passed: true,
              details: 'Environment variables served via HTTP'
            });
            resolve(true);
          } else {
            console.log('   ❌ Server endpoint missing variables');
            tests.push({
              name: 'Server Endpoint',
              passed: false,
              details: 'Missing environment variables in response'
            });
            resolve(false);
          }
        } catch (error) {
          console.log(`   ❌ Server endpoint parse error: ${error.message}`);
          tests.push({
            name: 'Server Endpoint',
            passed: false,
            details: `Parse error: ${error.message}`
          });
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      console.log('   ⚠️  Server not running (this is OK if server is not started)');
      tests.push({
        name: 'Server Endpoint',
        passed: null,
        details: 'Server not running - skipped'
      });
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('   ⚠️  Server timeout (this is OK if server is not started)');
      tests.push({
        name: 'Server Endpoint',
        passed: null,
        details: 'Server timeout - skipped'
      });
      resolve(null);
    });

    req.end();
  });
}

// Test 4: Test file configurations
function testFileConfigurations() {
  console.log('\n4. Testing test file configurations...');
  
  const testFiles = [
    '../database-config.js',
    './add-test-user-as-friend.js',
    './create-test-users.js',
    './auto-responder.js'
  ];
  
  let allPassed = true;
  
  testFiles.forEach(file => {
    try {
      // Clear require cache to force reload
      delete require.cache[require.resolve(file)];
      require(file);
      console.log(`   ✅ ${file} loads successfully`);
    } catch (error) {
      console.log(`   ❌ ${file} load error: ${error.message}`);
      allPassed = false;
    }
  });
  
  tests.push({
    name: 'Test File Configurations',
    passed: allPassed,
    details: `${testFiles.length} files checked`
  });
  
  return allPassed;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive environment variable tests...\n');
  
  const results = [];
  
  // Run tests
  results.push(testBasicEnvLoading());
  results.push(await testDatabaseConfig());
  results.push(await testServerEndpoint());
  results.push(testFileConfigurations());
  
  // Summary
  console.log('\n==========================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('==========================================');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  tests.forEach(test => {
    if (test.passed === true) {
      console.log(`✅ ${test.name}: PASSED - ${test.details}`);
      passed++;
    } else if (test.passed === false) {
      console.log(`❌ ${test.name}: FAILED - ${test.details}`);
      failed++;
    } else {
      console.log(`⚠️  ${test.name}: SKIPPED - ${test.details}`);
      skipped++;
    }
  });
  
  console.log('\n==========================================');
  console.log(`🎯 Final Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  
  if (failed === 0) {
    console.log('🎉 All critical tests passed! Environment variables are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration.');
  }
  
  console.log('==========================================');
}

// Run tests
runAllTests().catch(console.error);