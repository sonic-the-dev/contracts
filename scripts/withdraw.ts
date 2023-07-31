/* eslint-disable no-console */
import { ethers } from 'hardhat';

const network = process.env.HARDHAT_NETWORK;

async function main() {
  if (network !== 'arbitrumGoerli') {
    throw new Error('This script should only be run on arbitrumGoerli for now');
  }

  const game = await ethers.getContractAt(
    'SonicGame',
    process.env.GAME_CONTRACT_ADDRESS as string
  );

  const [owner] = await ethers.getSigners();

  const withdrawAmount = 1000 * 1e9;
  await game.connect(owner).withdraw(withdrawAmount);

  console.log(`Withdrew ${withdrawAmount} SONIC tokens from game`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
