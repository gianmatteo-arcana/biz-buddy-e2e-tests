const fs = require('fs');
const path = require('path');

// Read the current auth state
const authPath = path.join(__dirname, '.auth', 'user-state.json');
const authState = JSON.parse(fs.readFileSync(authPath, 'utf8'));

// Fix the localStorage key
if (authState.origins && authState.origins.length > 0) {
  const origin = authState.origins[0];
  
  // Update the origin to the correct URL
  origin.origin = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
  
  // Update localStorage entries
  if (origin.localStorage && origin.localStorage.length > 0) {
    origin.localStorage.forEach(item => {
      if (item.name === 'sb-raenkewzlvrdqufwxjpl-auth-token') {
        // Change to the correct key
        item.name = 'sb-cydmqfqbimqvpcejetxa-auth-token';
        console.log('✅ Fixed localStorage key');
      }
    });
  }
}

// Save the fixed auth state
fs.writeFileSync(authPath, JSON.stringify(authState, null, 2));
console.log('✅ Auth state fixed and saved');

// Verify the fix
const fixed = JSON.parse(fs.readFileSync(authPath, 'utf8'));
console.log('\nFixed auth state:');
console.log(`  Origin: ${fixed.origins[0].origin}`);
console.log(`  LocalStorage keys: ${fixed.origins[0].localStorage.map(i => i.name).join(', ')}`);