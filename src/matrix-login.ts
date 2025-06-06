#!/usr/bin/env node
// src/matrix-login.ts
// Script to login to Matrix and get a stable access token

import prompts from 'prompts';

interface MatrixLoginResponse {
  access_token: string;
  device_id: string;
  user_id: string;
  home_server?: string;
  expires_in_ms?: number;
  refresh_token?: string;
}

interface MatrixErrorResponse {
  errcode?: string;
  error?: string;
}

interface WhoAmIResponse {
  user_id: string;
  device_id?: string;
}

async function main() {
  console.log('Matrix Login Script');
  console.log('==================\n');
  console.log('This script will login to Matrix and get a stable access token.');
  console.log('The token will NOT support refresh tokens for maximum stability.\n');

  try {
    // Get user input using prompts library
    const questions = [
      {
        type: 'text',
        name: 'homeserver',
        message: 'Homeserver URL',
        initial: 'https://matrix.org'
      },
      {
        type: 'text',
        name: 'userId',
        message: 'Username (e.g., @user:matrix.org or just "user")'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password'
      },
      {
        type: 'text',
        name: 'deviceName',
        message: 'Device name',
        initial: 'GitHub Webhook Bot'
      }
    ];

    const answers = await prompts(questions);
    
    if (!answers.userId || !answers.password) {
      console.log('Username and password are required.');
      process.exit(1);
    }

    // Prepare login request
    const loginUrl = `${answers.homeserver}/_matrix/client/v3/login`;
    
    // Determine if it's a full user ID or just username
    let identifier;
    if (answers.userId.startsWith('@')) {
      identifier = {
        type: 'm.id.user',
        user: answers.userId
      };
    } else {
      identifier = {
        type: 'm.id.user',
        user: answers.userId
      };
    }

    const loginData = {
      type: 'm.login.password',
      identifier: identifier,
      password: answers.password,
      initial_device_display_name: answers.deviceName,
      refresh_token: false  // Explicitly disable refresh tokens
    };

    console.log('\nLogging in...');

    // Make login request
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    if (!response.ok) {
      const errorResult = await response.json() as MatrixErrorResponse;
      console.error('\nLogin failed!');
      console.error('Error:', errorResult.error || 'Unknown error');
      if (errorResult.errcode) {
        console.error('Error code:', errorResult.errcode);
      }
      process.exit(1);
    }

    const result = await response.json() as MatrixLoginResponse;

    // Success!
    console.log('\n✅ Login successful!\n');
    console.log('=== Login Response Details ===');
    console.log('User ID:', result.user_id);
    console.log('Device ID:', result.device_id);
    console.log('Home Server:', result.home_server || 'Not provided');
    
    if (result.expires_in_ms) {
      const hours = Math.floor(result.expires_in_ms / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) {
        console.log(`Token expires in: ${days} days, ${hours % 24} hours`);
      } else {
        console.log(`Token expires in: ${hours} hours`);
      }
      console.log(`Expiry (ms): ${result.expires_in_ms}`);
    } else {
      console.log('Token expiry: No expiration set');
    }
    
    console.log('\n=== Access Token ===');
    console.log('Access Token:', result.access_token);
    console.log('Token length:', result.access_token.length, 'characters');
    console.log('Token preview:', result.access_token.substring(0, 20) + '...');
    
    if (result.refresh_token) {
      console.log('\n⚠️  Warning: Server provided a refresh token despite our request.');
      console.log('This may indicate the server requires token refresh.');
    }
    
    // Test the token immediately
    console.log('\n=== Testing Token ===');
    try {
      const testResponse = await fetch(`${answers.homeserver}/_matrix/client/v3/account/whoami`, {
        headers: {
          'Authorization': `Bearer ${result.access_token}`
        }
      });
      
      if (testResponse.ok) {
        const testResult = await testResponse.json() as WhoAmIResponse;
        console.log('✅ Token test successful!');
        console.log('Verified user:', testResult.user_id);
        console.log('Device ID:', testResult.device_id);
      } else {
        const errorText = await testResponse.text();
        console.error('❌ Token test failed!');
        console.error('Status:', testResponse.status);
        console.error('Error:', errorText);
      }
    } catch (testError) {
      console.error('❌ Failed to test token:', testError);
    }
    
    if (result.expires_in_ms) {
      console.log(`\n⚠️  Warning: Token expires in ${Math.floor(result.expires_in_ms / (1000 * 60 * 60))} hours`);
      console.log('You may need to renew it periodically.');
    } else {
      console.log('\n✅ Token does not expire');
    }

    // Ask if user wants to set the token in Cloudflare
    const { setToken } = await prompts({
      type: 'confirm',
      name: 'setToken',
      message: 'Do you want to set this token in Cloudflare Workers?',
      initial: true
    });
    
    if (setToken) {
      console.log('\nSetting token in Cloudflare...');
      
      // Import child_process here to avoid issues at top level
      const { spawn } = await import('child_process');
      
      try {
        const wrangler = spawn('npx', ['wrangler', 'secret', 'put', 'MATRIX_TOKEN'], {
          stdio: ['pipe', 'inherit', 'inherit'],
          shell: true
        });
        
        // Write the token to stdin
        wrangler.stdin.write(result.access_token);
        wrangler.stdin.end();
        
        await new Promise((resolve, reject) => {
          wrangler.on('close', (code) => {
            if (code === 0) {
              console.log('\n✅ Token successfully set in Cloudflare!');
              resolve(code);
            } else {
              console.error('\n❌ Failed to set token in Cloudflare');
              console.log('\nYou can manually set it with:');
              console.log('npx wrangler secret put MATRIX_TOKEN');
              console.log('Then paste:', result.access_token);
              reject(new Error(`Wrangler exited with code ${code}`));
            }
          });
          
          wrangler.on('error', (err) => {
            console.error('\n❌ Error running wrangler:', err);
            console.log('\nYou can manually set it with:');
            console.log('npx wrangler secret put MATRIX_TOKEN');
            console.log('Then paste:', result.access_token);
            reject(err);
          });
        });
      } catch (error) {
        // Error already logged above
      }
    }

    console.log('\n📌 Important: Keep this device logged in to maintain token validity.');
    console.log('📌 Do not log out from "' + answers.deviceName + '" or the token will be invalidated.');

  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

// Run the script
main();