import "dotenv/config"
import { HardhatUserConfig } from "hardhat/config"

const ETH_RPC_URL = process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo"
const FORK_BLOCK = process.env.FORK_BLOCK ? Number(process.env.FORK_BLOCK) : undefined

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.24",
		settings: {
			optimizer: { enabled: true, runs: 200 },
		},
	},
	networks: {
		hardhat: {
			type: "edr-simulated",
			chainId: 31337,
			forking: ETH_RPC_URL
				? {
					url: ETH_RPC_URL,
					blockNumber: FORK_BLOCK,
				}
				: undefined,
		},
		localhost: {
			type: "http",
			url: "http://127.0.0.1:8545",
			chainId: 31337,
		},
	},
}

export default config