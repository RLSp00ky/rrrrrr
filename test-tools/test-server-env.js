require('dotenv').config({ path: '../.env' });

console.log('🔍 Testing Server Environment Variable Endpoint');
console.log('===============================================');

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/env-config',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const config = JSON.parse(data);
      console.log('\n✅ Environment Configuration Received:');
      console.log('=====================================');
      
      // Check each required variable
      const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TURN_USERNAME', 'TURN_CREDENTIAL'];
      
      requiredVars.forEach(varName => {
        if (config[varName]) {
          const maskedValue = varName.includes('KEY') || varName.includes('PASSWORD') 
            ? config[varName].substring(0, 10) + '...' 
            : config[varName];
          console.log(`✅ ${varName}: ${maskedValue}`);
        } else {
          console.log(`❌ ${varName}: Missing or empty`);
        }
      });
      
      console.log('\n🎯 Server Environment Variable Test Complete');
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.log('\n💡 Make sure the server is running on http://localhost:5000');
});

req.end();