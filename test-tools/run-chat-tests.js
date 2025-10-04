// Run Chat Tests Script
// This script provides options to run different chat testing utilities

const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 Chat Testing Tools');
console.log('====================');
console.log('1. Add TestUser1 as friend to shamanic');
console.log('2. Start auto-responder for TestUser1');
console.log('3. Send test message to shamanic');
console.log('4. Check realtime status');
console.log('5. Exit');
console.log('');

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runOption(option) {
  switch (option) {
    case '1':
      console.log('\n📝 Adding TestUser1 as friend to shamanic...');
      const addFriend = spawn('node', ['add-test-user-as-friend.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      await new Promise(resolve => addFriend.on('close', resolve));
      break;
      
    case '2':
      console.log('\n🤖 Starting auto-responder for TestUser1...');
      console.log('Press Ctrl+C to stop the auto-responder\n');
      const autoResponder = spawn('node', ['auto-responder.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      await new Promise(resolve => autoResponder.on('close', resolve));
      break;
      
    case '3':
      console.log('\n📤 Sending test message to shamanic...');
      const testMessage = spawn('node', ['test-realtime-direct.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      await new Promise(resolve => testMessage.on('close', resolve));
      break;
      
    case '4':
      console.log('\n🔍 Checking realtime status...');
      const checkRealtime = spawn('node', ['check-realtime-enabled.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      await new Promise(resolve => checkRealtime.on('close', resolve));
      break;
      
    case '5':
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
      
    default:
      console.log('\n❌ Invalid option');
  }
}

async function main() {
  while (true) {
    const option = await askQuestion('Select an option (1-5): ');
    await runOption(option);
    console.log('');
  }
}

main().catch(console.error);