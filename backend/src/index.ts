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

// POST/EMPLOYEES//

app.post('/employees', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'employeeNumber', 'department', 'jobTitle'],
      properties: {
        name: { type: 'string', minLength: 1 },
        employeeNumber: { type: 'integer' },
        department: { type: 'string', minLength: 1 },
        jobTitle: { type: 'string', minLength: 1 }
      }
    }
  }
}, async (request, reply) => {
  const data = request.body as {
    name: string
    employeeNumber: number
    department: string
    jobTitle: string
  }

  try {
    const employee = await prisma.employee.create({ data })
    reply.code(201)
    return employee
  } catch (error) {
    reply.code(409)
    return { error: 'An employee with that employee number already exists.' }
  }
})

//GET EMPLOYEE BY ID//

app.get('/employees/:id', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer' }
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params as { id: number }

  const employee = await prisma.employee.findUnique({
    where: { id }
  })

  if (!employee) {
    reply.code(404)
    return { error: 'Employee not found.' }
  }

  return employee
})