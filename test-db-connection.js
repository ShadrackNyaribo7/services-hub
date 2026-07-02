// Test database connection script
const { PrismaClient } = require('./src/generated/prisma/client');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Testing database connection...');
console.log('Database URL:', connectionString.replace(/:[^:@]+@/, ':****@'));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('Attempting to connect to database...');
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('Connection successful!', result);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
