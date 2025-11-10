import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export interface HiveMindConfig {
  apiUrl: string
  wsUrl: string
  token: string | null
  isAuthenticated: boolean
  nexusEnabled: boolean
  autoLearn: boolean
}

const defaultConfig: HiveMindConfig = {
  apiUrl: "http://localhost:3000",
  wsUrl: "ws://localhost:3000",
  token: null,
  isAuthenticated: false,
  nexusEnabled: true,
  autoLearn: true
}

export async function getConfig(): Promise<HiveMindConfig> {
  const config = await storage.get("hivemind-config")
  return { ...defaultConfig, ...config }
}

export async function setConfig(updates: Partial<HiveMindConfig>): Promise<void> {
  const config = await getConfig()
  await storage.set("hivemind-config", { ...config, ...updates })
}

export async function isAuthenticated(): Promise<boolean> {
  const config = await getConfig()
  return config.isAuthenticated && config.token !== null
}

export async function login(token: string): Promise<void> {
  await setConfig({ token, isAuthenticated: true })
}

export async function logout(): Promise<void> {
  await setConfig({ token: null, isAuthenticated: false })
}
