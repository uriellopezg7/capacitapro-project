import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'

const app = Fastify({ logger: true })
const prisma = new PrismaClient()

app.get('/health', async () => {
  return { status: 'ok' }
})

app.get('/employees', async () => {
  const employees = await prisma.employee.findMany()
  return employees
})

app.listen({ port: 3000 }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

