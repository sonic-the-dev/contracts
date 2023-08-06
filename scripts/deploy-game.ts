/* eslint-disable no-console */
import { ethers } from 'hardhat';

async function main() {
  const game = await ethers.deployContract('SonicGame');
  await game.waitForDeployment();
  console.log(`SonicGame deployed to: ${game.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
