/* eslint-disable no-console */
import { ethers } from 'hardhat';

const network = process.env.HARDHAT_NETWORK;

async function main() {
  let sonicAddress: string | null = null;

  if (network === 'sepolia') {
    const sonic = await ethers.deployContract('SonicFakeToken');
    await sonic.waitForDeployment();
    console.log(`SonicFakeToken deployed to: ${sonic.target}`);
    sonicAddress = await sonic.getAddress();
  }

  if (network === 'ethereum') {
    sonicAddress = '0x6D56cdDd23a693ED3851fA0A5d8c67A8739537C8';
  }

  if (!sonicAddress) {
    throw new Error('Sonic address not found');
  }

  const bridge = await ethers.deployContract('SonicGameBridge', [sonicAddress]);
  await bridge.waitForDeployment();

  console.log(`SonicGameBridge deployed to: ${bridge.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
