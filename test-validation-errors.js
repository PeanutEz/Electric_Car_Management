// Test script for validation errors
async function testValidationErrors() {
   console.log('Testing validation errors...\n');

   // Test empty data
   console.log('1. Testing empty data:');
   try {
      const response = await fetch('http://localhost:3000/api/user/register', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({})
      });
      const result = await response.json();
      console.log('Status:', response.status);
      console.log(JSON.stringify(result, null, 2));
   } catch (error) {
      console.error('Error:', error);
   }

   console.log('\n2. Testing invalid email format:');
   try {
      const response = await fetch('http://localhost:3000/api/user/register', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            full_name: 'Test User',
            email: 'invalid-email',
            password: 'password123'
         })
      });
      const result = await response.json();
      console.log('Status:', response.status);
      console.log(JSON.stringify(result, null, 2));
   } catch (error) {
      console.error('Error:', error);
   }

   console.log('\n3. Testing short password:');
   try {
      const response = await fetch('http://localhost:3000/api/user/register', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            full_name: 'Test User',
            email: 'test@example.com',
            password: '123'
         })
      });
      const result = await response.json();
      console.log('Status:', response.status);
      console.log(JSON.stringify(result, null, 2));
   } catch (error) {
      console.error('Error:', error);
   }

   console.log('\n4. Testing short full name:');
   try {
      const response = await fetch('http://localhost:3000/api/user/register', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            full_name: 'A',
            email: 'test@example.com',
            password: 'password123'
         })
      });
      const result = await response.json();
      console.log('Status:', response.status);
      console.log(JSON.stringify(result, null, 2));
   } catch (error) {
      console.error('Error:', error);
   }
}

// Test successful registration
async function testSuccessfulRegistration() {
   console.log('\n5. Testing successful registration:');
   try {
      const response = await fetch('http://localhost:3000/api/user/register', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            full_name: 'Phạm Vũ Gia Kiệt',
            email: 'kiet.test' + Date.now() + '@gmail.com',
            password: 'password123'
         })
      });
      const result = await response.json();
      console.log('Status:', response.status);
      console.log(JSON.stringify(result, null, 2));
   } catch (error) {
      console.error('Error:', error);
   }
}

// Run tests
testValidationErrors().then(() => {
   return testSuccessfulRegistration();
}).then(() => {
   console.log('\nAll tests completed!');
});