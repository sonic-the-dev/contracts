import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('SonicGame', () => {
  const deploySonicGameFixture = async () => {
    const [owner, playerA, playerB, playerC, playerD] =
      await ethers.getSigners();

    const SonicGame = await ethers.getContractFactory('SonicGame');
    const sonicGame = await SonicGame.deploy();

    return { sonicGame, owner, playerA, playerB, playerC, playerD };
  };

  describe('Deployment', () => {
    it('should deploy with the right params', async () => {
      const { sonicGame, owner } = await loadFixture(deploySonicGameFixture);

      expect(await sonicGame.owner()).to.equal(await owner.getAddress());
      expect(await sonicGame.name()).to.equal('SonicGame');
      expect(await sonicGame.currentRound()).to.equal('0');
      expect(await sonicGame.isPickingClosed()).to.equal(true);
      expect(await sonicGame.godfatherTax()).to.equal('1');
      expect(await sonicGame.winnersTax()).to.equal('5');
      expect(await sonicGame.winnersTaxWallet()).to.equal(
        '0x297Dd2A16DDf82efca38114C37bCcb25CED5f9b0'
      );
    });

    it('should let owner update tax wallet', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);

      const newTaxWallet = '0x66e4aDEdc1B86D752e4D5db82b09c224b626FB61';

      await expect(
        sonicGame.connect(playerA).ownerSetTaxWallet(newTaxWallet)
      ).to.be.revertedWith('Only owner can set tax wallet');

      await sonicGame.ownerSetTaxWallet(newTaxWallet);
      expect(await sonicGame.winnersTaxWallet()).to.equal(newTaxWallet);
    });

    it('should let owner update tax values', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);

      const newTaxValue = 10;

      await expect(
        sonicGame.connect(playerA).ownerSetWinnersTax(newTaxValue)
      ).to.be.revertedWith('Only owner can set winners tax');

      await expect(
        sonicGame.connect(playerA).ownerSetGodfatherTax(newTaxValue)
      ).to.be.revertedWith('Only owner can set godfather tax');

      await expect(sonicGame.ownerSetWinnersTax(200)).to.be.revertedWith(
        'Winners tax must be between 0 and 100'
      );

      await expect(sonicGame.ownerSetGodfatherTax(200)).to.be.revertedWith(
        'Godfather tax must be between 0 and 100'
      );

      await sonicGame.ownerSetWinnersTax(newTaxValue);
      await sonicGame.ownerSetGodfatherTax(newTaxValue);

      expect(await sonicGame.winnersTax()).to.equal(newTaxValue);
      expect(await sonicGame.godfatherTax()).to.equal(newTaxValue);
    });
  });

  describe('Balances', () => {
    it('should not allow withdraw 0 amount', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await expect(sonicGame.connect(playerA).withdraw(0)).to.be.revertedWith(
        'Withdraw must be greater than 0'
      );
    });

    it('should not allow withdraw before deposit', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await expect(sonicGame.connect(playerA).withdraw(100)).to.be.revertedWith(
        'Insufficient balance'
      );
    });

    it('should credit player from bridge deposit', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);

      const depositAmount = 1000 * 10e9;
      const playerAddress = await playerA.getAddress();

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        playerAddress,
        depositAmount
      );

      expect(await sonicGame.balanceOf(playerAddress)).to.equal(depositAmount);
    });

    it('should allow withdraw', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);

      const depositAmount = 1000 * 10e9;
      const playerAddress = await playerA.getAddress();

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        playerAddress,
        depositAmount
      );

      await sonicGame.connect(playerA).withdraw(depositAmount);
      expect(await sonicGame.balanceOf(playerAddress)).to.equal(0);
    });

    it('should not allow to deposit 0', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await expect(
        sonicGame['ownerCreditPlayer(address,uint256)'](
          await playerA.getAddress(),
          0
        )
      ).to.be.revertedWith('Amount must be greater than 0');
    });
  });

  describe('Round', () => {
    it('should not allow close round from non-owner', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await expect(sonicGame.connect(playerA).closeRound()).to.be.revertedWith(
        'Only owner can close a round'
      );
    });

    it('should not close round when game hasnt started', async () => {
      const { sonicGame } = await loadFixture(deploySonicGameFixture);
      await expect(sonicGame.closeRound()).to.be.revertedWith(
        'Game has not started yet'
      );
    });

    it('should not allow bet from non-owner', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await expect(
        sonicGame.connect(playerA).ownerBetForPlayer(playerA, 1, 100)
      ).to.be.revertedWith('Only owner can bet for a player');
    });

    it('should not allow bet when game hasnt started', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await expect(
        sonicGame.ownerBetForPlayer(await playerA.getAddress(), 1, 100)
      ).to.be.revertedWith('Game has not started yet');
    });

    it('should not allow to bet on picks out of range', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await sonicGame.start();

      await expect(
        sonicGame.ownerBetForPlayer(await playerA.getAddress(), 0, 100)
      ).to.be.revertedWith('Pick must be between 1 and 4');

      await expect(
        sonicGame.ownerBetForPlayer(await playerA.getAddress(), 5, 100)
      ).to.be.revertedWith('Pick must be between 1 and 4');
    });

    it('should not allow to bet 0', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await sonicGame.start();

      await expect(
        sonicGame.ownerBetForPlayer(await playerA.getAddress(), 1, 0)
      ).to.be.revertedWith('Amount must be greater than 0');
    });

    it('should not allow to bet more than balance', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await sonicGame.start();

      await expect(
        sonicGame.ownerBetForPlayer(await playerA.getAddress(), 1, 100)
      ).to.be.revertedWith('Insufficient balance');
    });

    it('should allow to bet', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await sonicGame.start();

      const depositAmount = 1000 * 10e9;
      const playerAddress = await playerA.getAddress();

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        playerAddress,
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(playerAddress, 1, depositAmount);
      expect(await sonicGame.balanceOf(playerAddress)).to.equal(0);
    });

    it('should allow to bet twice on same pick', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await sonicGame.start();

      const depositAmount = 1000 * 10e9;
      const playerAddress = await playerA.getAddress();

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        playerAddress,
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(playerAddress, 1, depositAmount / 2);
      expect(await sonicGame.balanceOf(playerAddress)).to.equal(
        depositAmount / 2
      );

      await sonicGame.ownerBetForPlayer(playerAddress, 1, depositAmount / 2);
      expect(await sonicGame.balanceOf(playerAddress)).to.equal(0);
    });

    it('should close round and stop allowing bets', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);
      await sonicGame.start();

      const depositAmount = 1000 * 10e9;
      const playerAddress = await playerA.getAddress();

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        playerAddress,
        depositAmount
      );

      await sonicGame.closeRound();

      await expect(
        sonicGame.ownerBetForPlayer(playerAddress, 1, depositAmount)
      ).to.be.revertedWith('Round is closed');
    });

    it('should not pick winner if round is not closed', async () => {
      const { sonicGame } = await loadFixture(deploySonicGameFixture);
      await expect(sonicGame.pickWinner(1)).to.be.revertedWith(
        'Game has not started yet'
      );

      await sonicGame.start();
      await expect(sonicGame.pickWinner(1)).to.be.revertedWith(
        'Round is not closed yet'
      );
    });

    it('should pick winner and distribute prizes', async () => {
      const { sonicGame, playerA, playerB, playerC, playerD } =
        await loadFixture(deploySonicGameFixture);

      await sonicGame.start();

      const depositAmount = 1000 * 10e9;

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        await playerA.getAddress(),
        depositAmount
      );

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        await playerB.getAddress(),
        depositAmount
      );

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        await playerC.getAddress(),
        depositAmount
      );

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        await playerD.getAddress(),
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(
        await playerA.getAddress(),
        1,
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(
        await playerB.getAddress(),
        2,
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(
        await playerC.getAddress(),
        3,
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(
        await playerD.getAddress(),
        4,
        depositAmount
      );

      await sonicGame.closeRound();

      await expect(sonicGame.pickWinner(0)).to.be.revertedWith(
        'Winner must be between 1 and 4'
      );

      await expect(sonicGame.pickWinner(5)).to.be.revertedWith(
        'Winner must be between 1 and 4'
      );

      await sonicGame.pickWinner(1);

      const total = depositAmount * 4;
      const taxes = depositAmount * 3 * 0.05;

      expect(await sonicGame.balanceOf(await playerA.getAddress())).to.equal(
        total - taxes
      );

      expect(await sonicGame.balanceOf(await playerB.getAddress())).to.equal(0);
      expect(await sonicGame.balanceOf(await playerC.getAddress())).to.equal(0);
      expect(await sonicGame.balanceOf(await playerD.getAddress())).to.equal(0);
    });

    it('should call `emergencyOwnerUnlockGame` and return bets', async () => {
      const { sonicGame, playerA } = await loadFixture(deploySonicGameFixture);

      await expect(sonicGame.emergencyOwnerUnlockGame()).to.be.revertedWith(
        'Game has not started yet'
      );

      await sonicGame.start();

      const depositAmount = 1000 * 10e9;
      const playerAddress = await playerA.getAddress();

      await sonicGame['ownerCreditPlayer(address,uint256)'](
        playerAddress,
        depositAmount
      );

      await sonicGame.ownerBetForPlayer(playerAddress, 1, depositAmount);
      expect(await sonicGame.balanceOf(playerAddress)).to.equal(0);

      await expect(
        sonicGame.connect(playerA).emergencyOwnerUnlockGame()
      ).to.be.revertedWith('Only owner can unlock the game');

      await sonicGame.emergencyOwnerUnlockGame();

      expect(await sonicGame.balanceOf(playerAddress)).to.equal(depositAmount);
    });
  });
});
