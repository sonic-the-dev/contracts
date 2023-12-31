/* eslint-disable no-console */
import { ethers } from 'hardhat';

const network = process.env.HARDHAT_NETWORK;

async function main() {
  if (network !== 'sepolia') {
    throw new Error('This script should only be run on sepolia for now');
  }

  const sonic = await ethers.getContractAt(
    'SonicFakeToken',
    process.env.SONIC_TOKEN_ADDRESS as string
  );

  const bridge = await ethers.getContractAt(
    'SonicGameBridge',
    process.env.BRIDGE_CONTRACT_ADDRESS as string
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

  await bridge['deposit(uint256)'](depositAmount);

  console.log(`Deposited ${depositAmount} SONIC tokens in bridge`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
