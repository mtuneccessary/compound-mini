import { ethers } from "ethers"
import fs from "fs"
import path from "path"

export function getProvider() {
	const url = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545"
	return new ethers.JsonRpcProvider(url)
}

export async function getSigner(index = 0) {
	const provider = getProvider()
	return await provider.getSigner(index)
}

export function loadAbi(relPath: string) {
	const p = path.resolve(process.cwd(), relPath)
	const raw = fs.readFileSync(p, "utf8")
	return JSON.parse(raw)
}

export function getEnvAddress(name: string): string {
	const val = process.env[name]
	if (!val) throw new Error(`Missing env var ${name}`)
	return val
}

export function getCometContract(providerOrSigner?: ethers.Provider | ethers.Signer) {
	const abi = loadAbi("abis/CometInterface.json")
	const address = getEnvAddress("COMET_ADDRESS")
	const conn = providerOrSigner ?? getProvider()
	return new ethers.Contract(address, abi, conn)
}

export function getErc20Contract(address: string, providerOrSigner?: ethers.Provider | ethers.Signer) {
	const abi = loadAbi("abis/ERC20.json")
	const conn = providerOrSigner ?? getProvider()
	return new ethers.Contract(address, abi, conn)
} 