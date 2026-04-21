import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata'];

async function getRefreshToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000' // This can be anything for local CLI auth
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get a refresh token
        scope: SCOPES,
        prompt: 'consent' // Forces consent screen to ensure refresh token is returned
    });

    console.log('1. Open this URL in your browser:');
    console.log('\x1b[36m%s\x1b[0m', authUrl);
    console.log('\n2. After authorizing, you will be redirected to a page (which might not load).');
    console.log('3. Copy the value of the "code" parameter from the URL in your browser address bar.');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('\n4. Enter the code from the URL here: ', async (code) => {
        rl.close();
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log('\n\x1b[32mSUCCESS!\x1b[0m');
            console.log('Copy this GOOGLE_REFRESH_TOKEN into your .env file:');
            console.log('\x1b[33m%s\x1b[0m', tokens.refresh_token);
        } catch (error) {
            console.error('Error retrieving access token:', error);
        }
    });
}

getRefreshToken();
