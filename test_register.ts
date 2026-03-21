
import fetch from 'node-fetch';

async function testRegister() {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      termsAccepted: true,
      privacyAccepted: true
    })
  });

  const data = await response.json();
  console.log('Registration Response:', data);
}

testRegister();
