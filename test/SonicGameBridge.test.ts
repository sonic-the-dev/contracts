import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('SonicGameBridge', () => {
  const deployBridgeContractFixture = async () => {
    const [owner, player] = await ethers.getSigners();

    const Sonic = await ethers.getContractFactory('SonicFakeToken');
    const sonic = await Sonic.deploy();

    const SonicGameBridge = await ethers.getContractFactory('SonicGameBridge');
    const sonicGameBridge = await SonicGameBridge.deploy(
      await sonic.getAddress()
    );

    return { sonic, sonicGameBridge, owner, player };
  };

  describe('Deployment', () => {
    it('should set the right sonic address', async () => {
      const { sonic, sonicGameBridge } = await loadFixture(
        deployBridgeContractFixture
      );

      expect(await sonicGameBridge.bridgedCoin()).to.equal(
        await sonic.getAddress()
      );
    });

    it('should mint fake SONIC to owner', async () => {
      const { sonic, owner } = await loadFixture(deployBridgeContractFixture);
      const totalSupply = await sonic.totalSupply();

      expect(await sonic.balanceOf(await owner.getAddress())).to.equal(
        totalSupply
      );
    });
  });

  describe('Deposit', () => {
    it('should deposit SONIC', async () => {
      const { sonic, sonicGameBridge, player } = await loadFixture(
        deployBridgeContractFixture
      );

      const depositAmount = 1000 * 10e9;
      const playerAddress = await player.getAddress();

      await sonic.transfer(playerAddress, depositAmount);
      expect(await sonic.balanceOf(playerAddress)).to.equal(depositAmount);

      await sonic
        .connect(player)
        .approve(await sonicGameBridge.getAddress(), depositAmount);

      await sonicGameBridge.connect(player).deposit(depositAmount);

      const playerSonicBalance = await sonic.balanceOf(playerAddress);
      expect(playerSonicBalance).to.equal(0);

      const playerBridgeBalance = await sonicGameBridge.balanceOf(
        playerAddress
      );
      expect(playerBridgeBalance).to.equal(depositAmount);
    });
  });

  describe('Withdraw', () => {
    it('should not allow withdraw from non-owner', async () => {
      const { sonicGameBridge, player } = await loadFixture(
        deployBridgeContractFixture
      );

      await expect(
        sonicGameBridge
          .connect(player)
          .ownerWithdrawTo(await player.getAddress(), 1000)
      ).to.be.revertedWith('Only the owner can withdraw');
    });

    it('should not allow withdraw if balance is unsufficient', async () => {
      const { sonicGameBridge, player } = await loadFixture(
        deployBridgeContractFixture
      );

      await expect(
        sonicGameBridge.ownerWithdrawTo(await player.getAddress(), 1000)
      ).to.be.revertedWith('Insufficient balance');
    });

    it('should allow withdraw', async () => {
      const { sonic, sonicGameBridge, player } = await loadFixture(
        deployBridgeContractFixture
      );

      const depositAmount = 1000 * 10e9;
      const playerAddress = await player.getAddress();

      // transfer SONIC to player
      await sonic.transfer(playerAddress, depositAmount);

      // approve SONIC to sonicGameBridge
      await sonic
        .connect(player)
        .approve(await sonicGameBridge.getAddress(), depositAmount);

      // deposit SONIC to sonicGameBridge
      await sonicGameBridge.connect(player).deposit(depositAmount);
      expect(await sonicGameBridge.balanceOf(playerAddress)).to.equal(
        depositAmount
      );

      // withdraw SONIC from sonicGameBridge
      await sonicGameBridge.ownerWithdrawTo(playerAddress, depositAmount);
      expect(await sonicGameBridge.balanceOf(playerAddress)).to.equal(0);

      // check player SONIC balance
      expect(await sonic.balanceOf(playerAddress)).to.equal(depositAmount);
    });
  });
});
