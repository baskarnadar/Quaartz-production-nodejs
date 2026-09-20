// test-admin-email.js
// Run from the project root:  node test-admin-email.js
// Checks each step of the admin-email chain and then sends a real test email.

require('dotenv').config();

const { connectToMongoDB } = require('./database/mongodb');
const { getAdminEmails } = require('./controllers/services/emailservice');
const { adminOrderTemplate } = require('./controllers/emailtemplates/orderEmailTemplate');
const nodemailer = require('nodemailer');

function line(t) {
  console.log('\n' + '-'.repeat(60) + '\n' + t + '\n' + '-'.repeat(60));
}

(async () => {
  line('1. ENVIRONMENT');
  console.log('ADMIN_EMAILS            :', process.env.ADMIN_EMAILS || '(not set)');
  console.log('ADMIN_EMAIL_COLLECTION  :', process.env.ADMIN_EMAIL_COLLECTION || '(not set -> tbladminemail)');
  console.log('ADMIN_EMAIL_API         :', process.env.ADMIN_EMAIL_API || '(default sigmapaints)');
  console.log('SMTP_HOST               :', process.env.SMTP_HOST || '(not set)');
  console.log('SMTP_USER               :', process.env.SMTP_USER || '(not set)');
  console.log('SMTP_PASS               :', process.env.SMTP_PASS ? process.env.SMTP_PASS.length + ' chars' : '*** EMPTY ***');
  console.log('MAIL_FROM               :', process.env.MAIL_FROM || '(not set)');

  const db = await connectToMongoDB();

  line('2. COLLECTIONS THAT LOOK LIKE ADMIN EMAILS');
  const names = await db.listCollections().toArray();
  const candidates = names.map((c) => c.name).filter((n) => /admin|email|setting/i.test(n));
  console.log(candidates.length ? candidates : '(none matched /admin|email|setting/)');

  for (const name of candidates) {
    const rows = await db.collection(name).find({}).limit(3).toArray();
    console.log(`\n  ${name}:`, JSON.stringify(rows, null, 2));
  }

  line('3. WHAT getAdminEmails() RESOLVES');
  const adminEmails = await getAdminEmails(db);
  console.log('resolved  :', adminEmails);
  console.log('count     :', adminEmails.length);

  if (!adminEmails.length) {
    console.log('\n>>> STOP. No recipients. Set ADMIN_EMAILS in .env, or point');
    console.log('>>> ADMIN_EMAIL_COLLECTION at the right collection from step 2.');
    process.exit(1);
  }

  line('4. SMTP CONNECTION');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });

  await transporter.verify();
  console.log('SMTP OK');

  line('5. SENDING THE ADMIN EMAIL');
  const mail = adminOrderTemplate({
    CustomerName: 'Ahmed Al Salem',
    CustomerEmail: 'test@example.com',
    CustomerMobile: '500854321',
    CustomerCity: 'Rabigh',
    UserOrderNo: 'TEST123',
    OrderRefNo: 'diagnostic-run',
    DeliveryType: 'COLLECT-FROM-STORE',
    StoreName: 'Test Store',
    Items: [{ Name: 'Sigma Test Product', SizeName: '1 Liter', Qty: 1, Amount: 85, LineTotal: 85 }],
    OrderTotal: 85,
    PlacedAt: new Date().toLocaleString(),
  });

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: adminEmails,
    subject: '[TEST] ' + mail.subject,
    text: mail.text,
    html: mail.html,
  });

  console.log('messageId :', info.messageId);
  console.log('accepted  :', info.accepted);
  console.log('rejected  :', info.rejected);
  console.log('response  :', info.response);

  process.exit(0);
})().catch((err) => {
  console.error('\nFAILED:', err);
  process.exit(1);
});
