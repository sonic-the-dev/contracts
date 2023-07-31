/* eslint-disable no-console */
import { ethers } from 'hardhat';

const network = process.env.HARDHAT_NETWORK;

async function main() {
  if (network !== 'arbitrumGoerli') {
    throw new Error('This script should only be run on arbitrumGoerli for now');
  }

  const sonic = await ethers.getContractAt(
    'SonicFakeToken',
    '0x9bBBB736576cc6dBFEC4174811131157906ac84E'
  );

  const bridge = await ethers.getContractAt(
    'SonicGameBridge',
    '0x36b3CB006e638F56b954255b2A668476713975B1'
  );

  const [owner] = await ethers.getSigners();
  const balance = await sonic.balanceOf(await owner.getAddress());

  console.log(`SonicFakeToken balance: ${balance.toString()}`);

  const depositAmount = 1000 * 1e9;

  const approvals = await sonic.allowance(
    await owner.getAddress(),
    await bridge.getAddress()
  );

  if (approvals < depositAmount) {
    await sonic.approve(await bridge.getAddress(), balance);
  }

  await bridge.deposit(depositAmount);

  console.log(`Deposited ${depositAmount} SONIC tokens in bridge`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
