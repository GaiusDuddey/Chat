import { Worker } from 'bullmq';

// Email notification worker
const emailWorker = new Worker(
  'notifications',
  async (job) => {
    const { email, senderName, messagePreview, conversationId } = job.data;

    // In production, integrate with a real email service (SendGrid, Nodemailer, etc.)
    console.log(`📧 Sending email notification to ${email}`);
    console.log(`   From: ${senderName}`);
    console.log(`   Preview: ${messagePreview}`);
    console.log(`   Conversation: ${conversationId}`);

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { sent: true, email };
  },
  {
    connection: {
      host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
      port: parseInt(
        new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'
      ),
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job?.id} failed:`, err.message);
});

export default emailWorker;
