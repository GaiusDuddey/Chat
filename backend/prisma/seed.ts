import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash,
      bio: 'Hey there! I am using RealChat.',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash,
      bio: 'Hello world!',
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash,
      bio: 'System design enthusiast 🚀',
    },
  });

  // Create a direct conversation between alice and bob
  const directConvo = await prisma.conversation.create({
    data: {
      type: 'direct',
      createdBy: alice.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
        ],
      },
    },
  });

  // Create a group conversation
  const groupConvo = await prisma.conversation.create({
    data: {
      type: 'group',
      name: 'RealChat Dev Team',
      createdBy: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'admin' },
          { userId: bob.id },
          { userId: charlie.id },
        ],
      },
    },
  });

  // Add some messages to the direct conversation
  await prisma.message.createMany({
    data: [
      {
        conversationId: directConvo.id,
        senderId: alice.id,
        content: 'Hey Bob! Welcome to RealChat! 👋',
        type: 'text',
      },
      {
        conversationId: directConvo.id,
        senderId: bob.id,
        content: 'Hi Alice! This is amazing, love the real-time features!',
        type: 'text',
      },
      {
        conversationId: directConvo.id,
        senderId: alice.id,
        content: 'Thanks! The WebSocket integration with Socket.IO was fun to build.',
        type: 'text',
      },
    ],
  });

  // Add messages to the group conversation
  await prisma.message.createMany({
    data: [
      {
        conversationId: groupConvo.id,
        senderId: alice.id,
        content: 'Welcome everyone to the RealChat Dev Team! 🎉',
        type: 'text',
      },
      {
        conversationId: groupConvo.id,
        senderId: charlie.id,
        content: 'Excited to be here! The system design behind this is solid.',
        type: 'text',
      },
      {
        conversationId: groupConvo.id,
        senderId: bob.id,
        content: 'The Redis pub/sub adapter for scaling is a great touch!',
        type: 'text',
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log(`   Users: alice, bob, charlie (password: password123)`);
  console.log(`   Direct conversation: alice ↔ bob`);
  console.log(`   Group: "RealChat Dev Team" (alice, bob, charlie)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
