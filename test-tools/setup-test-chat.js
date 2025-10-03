// Setup Test Chat Script
// This script adds TestUser1 as a friend to shamanic and starts the auto-responder

const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 Setting up test chat environment...');
console.log('=====================================');

// Step 1: Add TestUser1 as a friend to shamanic
console.log('\n📝 Step 1: Adding TestUser1 as a friend to shamanic...');
console.log('You will need to provide shamanic\'s password when prompted.');

const addFriendProcess = spawn('node', [path.join(__dirname, 'add-test-user-as-friend.js')], {
  stdio: 'inherit'
});

addFriendProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to add TestUser1 as a friend');
    return;
  }
  
  console.log('\n📝 Step 2: Starting auto-responder for TestUser1...');
  console.log('TestUser1 will automatically respond to messages sent by shamanic.');
  console.log('Press Ctrl+C to stop the auto-responder.\n');
  
  // Step 2: Start the auto-responder
  const autoResponderProcess = spawn('node', [path.join(__dirname, 'auto-responder.js')], {
    stdio: 'inherit'
  });
  
  autoResponderProcess.on('close', (code) => {
    console.log(`Auto-responder process exited with code ${code}`);
  });
});