import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-vyper';
import type { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.19',
  vyper: { version: '0.3.7' },
  networks: {
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL,
      chainId: 1,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      chainId: 42161,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    arbitrumGoerli: {
      url: process.env.ARBITRUM_GOERLI_RPC_URL,
      chainId: 421613,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
};

export default config;
