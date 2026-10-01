import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import jwt from '@fastify/jwt'
import bcrypt from 'bcrypt'

const app = Fastify({ logger: true }) 

app.register(jwt, {
  secret: process.env.JWT_SECRET as string
})


//AUTH FUNCTION //
async function requireAuth(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (error) {
    reply.code(401)
    return reply.send({ error: 'Authentication required.' })
  }
}

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
  preHandler: requireAuth, 
  /*tells Fastify "run this function before the main handler, 
    on every request to this route." If it rejects, 
    the main function never executes.*/
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

//REGISTRATION ENDPOINT //
app.post('/auth/register', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', minLength: 1 },
        password: { type: 'string', minLength: 8 },
        role: { type: 'string', enum: ['ADMIN', 'INSTRUCTOR'] }
      }
    }
  }
}, async (request, reply) => {
  const { name, email, password, role } = request.body as {
    name: string
    email: string
    password: string
    role: 'ADMIN' | 'INSTRUCTOR'
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role }
    })
    reply.code(201)
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  } catch (error) {
    reply.code(409)
    return { error: 'A user with that email already exists.' }
  }
})

// LOGIN ENDPOINT //
app.post('/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', minLength: 1 },
        password: { type: 'string', minLength: 1 }
      }
    }
  }
}, async (request, reply) => {
  const { email, password } = request.body as {
    email: string
    password: string
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    reply.code(401)
    return { error: 'Invalid email or password.' }
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)

  if (!passwordMatches) {
    reply.code(401)
    return { error: 'Invalid email or password.' }
  }

  const token = app.jwt.sign({ userId: user.id, role: user.role })

  return { token }
})


