// Run: npx tsx scripts/generate-vapid.ts
// Generates VAPID keys for Web Push Notifications

import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("\n✅ VAPID keys generated!\n");
console.log("Add these to your .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log('\nVAPID_EMAIL="mailto:admin@neuramed.uz"\n');
