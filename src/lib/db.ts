import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // لوغ الاستعلامات للتطوير فقط — إيقافه في الإنتاج وفرُ أداء حقيقي على الخادم
    // المحلي الصغير (كل استعلام كان يُطبع بلا استثناء — المرحلة 8: تحسين الأداء SPEC §8)
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db