import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
let TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '';
const targetPhone = process.argv[2] || process.env.TEST_TARGET_PHONE || '';


console.log('='.repeat(60));
console.log('📡 TWILIO LIVE SMS GATEWAY SETUP & VERIFICATION');
console.log('='.repeat(60));
console.log(`• Account SID:      ${TWILIO_ACCOUNT_SID}`);
console.log(`• Auth Token:       ${TWILIO_AUTH_TOKEN.slice(0, 6)}...${TWILIO_AUTH_TOKEN.slice(-4)}`);
console.log(`• Target Recipient: ${targetPhone}`);
console.log('-'.repeat(60));

async function main() {
  const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    // 1. Verify Account SID & Token via Twilio Accounts API
    console.log('\n[Step 1] Validating Twilio Account credentials...');
    const accountRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json`, {
      headers: { Authorization: authHeader },
    });

    const accountData = await accountRes.json();
    if (!accountRes.ok) {
      console.error(`❌ Authentication failed (${accountRes.status}):`, accountData.message || accountData);
      process.exit(1);
    }

    console.log(`✅ Twilio Account Verified: "${accountData.friendly_name}" (Status: ${accountData.status}, Type: ${accountData.type})`);

    // 2. Discover Active Incoming Phone Numbers on the account
    console.log('\n[Step 2] Checking Active Twilio Phone Numbers...');
    const numbersRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
      headers: { Authorization: authHeader },
    });
    const numbersData = await numbersRes.json();

    if (numbersData.incoming_phone_numbers && numbersData.incoming_phone_numbers.length > 0) {
      const activeNumber = numbersData.incoming_phone_numbers[0].phone_number;
      console.log(`✅ Found Active Twilio Number: ${activeNumber} (${numbersData.incoming_phone_numbers[0].friendly_name})`);
      TWILIO_FROM_NUMBER = activeNumber;
    } else {
      console.log('ℹ️ No active Twilio virtual number found. Attempting to provision a free trial number via API...');
      // Try searching for an available US number with SMS capability
      const availRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&limit=1`, {
        headers: { Authorization: authHeader },
      });
      const availData = await availRes.json();

      if (availData.available_phone_numbers && availData.available_phone_numbers.length > 0) {
        const candidateNumber = availData.available_phone_numbers[0].phone_number;
        console.log(`🔍 Found available trial number: ${candidateNumber}. Provisioning...`);

        const buyRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ PhoneNumber: candidateNumber }).toString(),
        });

        const buyData = await buyRes.json();
        if (buyRes.ok) {
          console.log(`🎉 Successfully provisioned Twilio number: ${buyData.phone_number}!`);
          TWILIO_FROM_NUMBER = buyData.phone_number;
        } else {
          console.log(`⚠️ Automatic provisioning response (${buyRes.status}):`, buyData.message || buyData);
        }
      } else {
        console.log('Could not find available US numbers automatically:', availData);
      }
    }

    // 3. Check Verified Caller IDs (Whitelist on trial accounts)
    console.log('\n[Step 3] Checking Verified Caller IDs (Trial Recipient Whitelist)...');
    const callerIdsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/OutgoingCallerIds.json`, {
      headers: { Authorization: authHeader },
    });
    const callerIdsData = await callerIdsRes.json();
    let isRecipientVerified = false;

    if (callerIdsData.outgoing_caller_ids && callerIdsData.outgoing_caller_ids.length > 0) {
      console.log(`📋 Whitelisted Verified Caller IDs on Account:`);
      callerIdsData.outgoing_caller_ids.forEach(cid => {
        console.log(`   - ${cid.phone_number} (${cid.friendly_name})`);
        if (cid.phone_number === targetPhone || cid.phone_number === `+91${targetPhone.replace(/\D/g, '').slice(-10)}`) {
          isRecipientVerified = true;
        }
      });
    } else {
      console.log('⚠️ No verified caller IDs listed yet.');
    }

    // Update .env with credentials
    if (TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
      console.log('\n[Step 4] Updating .env file with active Twilio credentials...');
      let envTxt = fs.readFileSync(envPath, 'utf8');
      envTxt = envTxt.replace(/TWILIO_AUTH_TOKEN=.*/, `TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}`);
      envTxt = envTxt.replace(/TWILIO_FROM_NUMBER=.*/, `TWILIO_FROM_NUMBER=${TWILIO_FROM_NUMBER}`);
      fs.writeFileSync(envPath, envTxt, 'utf8');
      console.log(`✅ Saved TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER (${TWILIO_FROM_NUMBER}) to .env`);
    }

    // 5. Send Live Test SMS OTP
    if (TWILIO_FROM_NUMBER && targetPhone) {
      const formattedTo = targetPhone.startsWith('+') ? targetPhone : `+91${targetPhone.replace(/\D/g, '').slice(-10)}`;
      console.log(`\n[Step 5] Sending LIVE test OTP SMS to ${formattedTo} from ${TWILIO_FROM_NUMBER}...`);

      const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const messageBody = `[Green Enlightenment NGO] Your live OTP verification code is ${testOtp}. Valid for 10 minutes. Do not share.`;

      const params = new URLSearchParams({
        To: formattedTo,
        From: TWILIO_FROM_NUMBER,
        Body: messageBody,
      });

      const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const smsData = await smsRes.json();
      if (!smsRes.ok) {
        console.error(`❌ SMS Dispatch failed (${smsRes.status}):`, smsData.message || smsData);
        if (smsData.code === 21608) {
          console.log('\n💡 Notice: On a Twilio Trial account, unverified numbers cannot receive SMS.');
          console.log(`👉 Please add "${formattedTo}" to Verified Caller IDs in Twilio Console:`);
          console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/verified-caller-ids');
        }
      } else {
        console.log(`\n🎉🎉 SUCCESS: LIVE SMS DISPATCHED TO YOUR PHONE! 🎉🎉`);
        console.log(`• Message SID:   ${smsData.sid}`);
        console.log(`• Status:        ${smsData.status}`);
        console.log(`• Date Created:  ${smsData.date_created}`);
        console.log(`• Sent OTP Code: ${testOtp}`);
        console.log(`• Recipient:     ${formattedTo}`);
      }
    } else if (!TWILIO_FROM_NUMBER) {
      console.log('\n👉 Please get a free trial phone number in your Twilio Console:');
      console.log('   Go to: https://console.twilio.com and click "Get a trial number".');
    }

  } catch (err) {
    console.error('❌ Execution error:', err.message);
  }
}

main();
