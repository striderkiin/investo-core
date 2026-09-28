import { clients, folders, pricingPlans, projects, tasks, teams, users } from '@/assets/data/other'
import { customers, ordersData, products } from '@/assets/data/products'
import type {
  ClientType,
  CustomerType,
  FolderType,
  OrderType,
  PricingType,
  ProductType,
  ProjectType,
  TaskType,
  TeamType,
  UserType,
} from '@/types/data'
import { sleep } from '@/utils/promise'

export const getAllClients = async (): Promise<ClientType[]> => {
  const data = clients.map((client) => {
    const user = users.find((user) => user.id === client.userId)
    return {
      ...client,
      user,
    }
  })
  await sleep()
  return data
}

export const getAllOrderItems = async (): Promise<OrderType[]> => {
  const data = ordersData.map((order) => {
    const product = products.find((product) => product.id === order.productId)
    return {
      ...order,
      product,
    }
  })
  await sleep()
  return data
}

export const getUserById = async (id: UserType['id']): Promise<UserType | undefined> => {
  const data = users.find((user) => user.id === id)
  await sleep()
  return data
}

export const getAllUsers = async (): Promise<UserType[]> => {
  const data = users
  await sleep()
  return data
}

export const getAllProducts = async (): Promise<ProductType[]> => {
  await sleep()
  return products
}

export const getAllCustomers = async (): Promise<CustomerType[]> => {
  await sleep()
  return customers
}

export const getAllFolders = async (): Promise<FolderType[]> => {
  await sleep()
  return folders
}

export const getCustomersById = async (id: CustomerType['id']): Promise<CustomerType | undefined> => {
  const data = customers.find((customer) => customer.id == id)
  await sleep()
  return data
}

export const getOrderById = async (id: ProductType['id']): Promise<ProductType | undefined> => {
  const data = products.find((product) => product.id == id)
  await sleep()
  return data
}

export const getAllPricingPlans = async (): Promise<PricingType[]> => {
  await sleep()
  return pricingPlans
}

export const getAllTeams = async (): Promise<TeamType[]> => {
  const data = teams.map((team) => {
    const user = users.find((user) => user.id === team.userId)
    const members = team.membersId.map((member) => {
      const teamMembers = users.find((user) => user.id === member)
      if (teamMembers) {
        return teamMembers
      }
    })
    return {
      ...team,
      user,
      members,
    }
  })
  await sleep()
  return data
}

export const getAllProjects = async (): Promise<ProjectType[]> => {
  const allTeams = await getAllTeams()
  const data = projects.map((project) => {
    const teams = allTeams.find((team) => team.id === project.teamId)

    return {
      ...project,
      teams,
    }
  })
  await sleep()
  return data
}

export const getAllTasks = async (): Promise<TaskType[]> => {
  const allProjects = await getAllProjects()
  const data = tasks.map((task) => {
    const projects = allProjects.find((project) => project.id === task.projectId)
    const allUsers = users.find((user) => user.id === task.userId)

    return {
      ...task,
      projects,
      allUsers,
    }
  })
  await sleep()
  return data
}
