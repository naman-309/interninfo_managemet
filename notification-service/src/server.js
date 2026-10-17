import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// 1. Redis Subscriber (Sunne wala)
const subscriber = new Redis(process.env.REDIS_CONNECTION_STRING);
const channel = process.env.NOTIFICATION_EVENT_CHANNEL;

// 2. Email bhejne wala transporter (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// 3. Redis se connect hone par message print karo
subscriber.subscribe(channel, (err, count) => {
    if (err) {
        console.error('🔴 Redis Subscribe Error:', err.message);
    } else {
        console.log(`=================================`);
        console.log(`🟢 Notification Service listening on: ${channel}`);
        console.log(`=================================`);
    }
});

// 4. Jab bhi Redis par naya message aaye, ye function chalega
subscriber.on('message', async (channel, message) => {
    try {
        const data = JSON.parse(message);
        const { eventType, payload } = data;

        console.log(`📩 Naya Message Aaya: ${eventType}`);

        // Agar Payment aayi hai:
        if (eventType === 'PAYMENT_RECORDED') {
            await transporter.sendMail({
                from: `"InternInfotech" <${process.env.SMTP_USER}>`,
                to: payload.studentEmail,
                subject: `Payment Receipt: ₹${payload.amountPaid}`,
                html: `
          <h3>Hello ${payload.studentName},</h3>
          <p>We have received your payment of <b>₹${payload.amountPaid}</b> for ${payload.courseName}.</p>
          <p>Remaining Balance: ₹${payload.remainingBalance}</p>
          <br>
          <p>Regards,<br>InternInfotech Team</p>
        `
            });
            console.log(`✅ Payment Email sent to ${payload.studentEmail}`);
        }

        // Agar Password Reset karna hai:
        if (eventType === 'PASSWORD_RESET_REQUESTED') {
            await transporter.sendMail({
                from: `"InternInfotech" <${process.env.SMTP_USER}>`,
                to: payload.studentEmail,
                subject: `Password Reset Request`,
                html: `
          <h3>Hello ${payload.studentName},</h3>
          <p>Your password reset token is: <b>${payload.resetToken}</b></p>
          <p>Please use this token to reset your password. It expires in 15 minutes.</p>
        `
            });
            console.log(`✅ Reset Email sent to ${payload.studentEmail}`);
        }

    } catch (error) {
        console.error(`❌ Error processing email:`, error.message);
    }
});