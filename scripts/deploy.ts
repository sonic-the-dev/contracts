/* eslint-disable no-console */
import { ethers } from 'hardhat';

const network = process.env.HARDHAT_NETWORK;

async function main() {
  if (network !== 'arbitrumGoerli') {
    throw new Error('This script should only be run on arbitrumGoerli for now');
  }

  const sonic = await ethers.deployContract('SonicFakeToken');
  await sonic.waitForDeployment();
  console.log(`SonicFakeToken deployed to: ${sonic.target}`);

  const game = await ethers.deployContract('SonicGame');
  await game.waitForDeployment();
  console.log(`SonicGame deployed to: ${game.target}`);

  const bridge = await ethers.deployContract('SonicGameBridge', [
    await sonic.getAddress(),
  ]);

  await bridge.waitForDeployment();
  console.log(`SonicGameBridge deployed to: ${bridge.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
