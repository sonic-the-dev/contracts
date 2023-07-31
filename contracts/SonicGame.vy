event Deposit:
  player: indexed(address)
  godfather: indexed(address)
  amount: uint256

event Withdraw:
  player: indexed(address)
  amount: uint256

event Bet:
  player: indexed(address)
  pick: indexed(uint256)
  round: indexed(uint256)
  amount: uint256

event PickingClosed:
  round: indexed(uint256)

event PickingOpened:
  round: indexed(uint256)

event WinnerPicked:
  round: indexed(uint256)
  winner: indexed(uint256)

event PlayerWon:
  player: indexed(address)
  amount: uint256

event PlayerLost:
  player: indexed(address)
  amount: uint256

event DustCollected:
  amount: uint256

MAX_PLAYERS_PER_ROUND: constant(uint256) = 1000

name: public(String[32])
balanceOf: public(HashMap[address, uint256])
owner: public(address)

currentRound: public(uint256)
isPickingClosed: public(bool)

roundsPlayersPicks: public(HashMap[uint256, HashMap[address, uint256[4]]])
roundsWinners: public(HashMap[uint256, uint256])
winnersCount: public(HashMap[uint256, uint256])

winnersTax: public(uint256)
winnersTaxWallet: public(address)

hasAlreadyDeposited: HashMap[address, bool]
godfathers: HashMap[address, address]
godfatherTax: public(uint256)

currentRoundPlayersCount: uint256
currentRoundPlayers: address[MAX_PLAYERS_PER_ROUND]

playersLockedBalances: HashMap[address, uint256]

@external
def __init__():
  self.name = "SonicGame"
  self.owner = msg.sender
  self.currentRound = 0
  self.currentRoundPlayersCount = 0
  self.isPickingClosed = True
  self.godfatherTax = 1
  self.winnersTax = 5
  self.winnersTaxWallet = 0x297Dd2A16DDf82efca38114C37bCcb25CED5f9b0

@external
@nonreentrant("ownerCreditPlayer")
def ownerCreditPlayer(_player: address, _amount: uint256,  _godfather: address = empty(address)) -> bool:
  assert _amount > 0, "Amount must be greater than 0"
  assert msg.sender == self.owner, "Only owner can credit a player"

  # godfather is optional
  # - check its not 0x0, check its not the sender, check the sender has not already a godfather, and its first deposit
  if _godfather != empty(address) and _godfather != _player and self.godfathers[_player] == empty(address) and self.hasAlreadyDeposited[_player] == False:
    self.godfathers[_player] = _godfather

  # keep track if first deposit or not
  self.hasAlreadyDeposited[_player] = True

  # credit the player balance
  self.balanceOf[_player] += _amount
  log Deposit(_player, _godfather, _amount)

  return True

@external
@nonreentrant("withdraw")
def withdraw(_amount: uint256) -> bool:
  assert _amount > 0, "Withdraw must be greater than 0"
  assert self.balanceOf[msg.sender] >= _amount, "Insufficient balance"

  # withdraw from player balance
  # and write a log for API to transfer coins on ETH
  self.balanceOf[msg.sender] -= _amount
  log Withdraw(msg.sender, _amount)

  return True

@external
@nonreentrant("ownerBetForPlayer")
def ownerBetForPlayer(_player: address, _pick: uint256, _amount: uint256) -> bool:
  assert msg.sender == self.owner, "Only owner can bet for a player"
  assert self.currentRound > 0, "Game has not started yet"
  assert self.isPickingClosed == False, "Round is closed"
  assert _pick >= 1 and _pick <= 4, "Pick must be between 1 and 4"
  assert _amount > 0, "Amount must be greater than 0"
  assert self.balanceOf[_player] >= _amount, "Insufficient balance"

  # we save players in the current round for emergency unlock if needed
  if self._hasPlayerPicked(_player) == False:
    self.currentRoundPlayers[self.currentRoundPlayersCount] = _player
    self.currentRoundPlayersCount += 1

  # we pass _pick - 1, because the pick is 1 based but the array is 0 based
  self.roundsPlayersPicks[self.currentRound][_player][_pick - 1] += _amount
  self.playersLockedBalances[_player] += _amount
  self.balanceOf[_player] -= _amount
  log Bet(_player, _pick, self.currentRound, _amount)

  return True

@external
def start() -> bool:
  assert msg.sender == self.owner, "Only owner can start a new round"
  assert self.currentRound == 0, "Game has already started"
  self.currentRound += 1
  self.isPickingClosed = False
  return True

@external
def closeRound() -> bool:
  assert msg.sender == self.owner, "Only owner can close a round"
  assert self.currentRound > 0, "Game has not started yet"
  assert self.isPickingClosed == False, "Round is already closed"
  self.isPickingClosed = True
  log PickingClosed(self.currentRound)
  return True

@external
def pickWinner(_winner: uint256) -> uint256:
  assert msg.sender == self.owner, "Only owner can pick a winner"
  assert self.currentRound > 0, "Game has not started yet"
  assert self.isPickingClosed == True, "Round is not closed yet"
  assert self.roundsWinners[self.currentRound] == 0, "Winner has already been picked"
  assert _winner >= 1 and _winner <= 4, "Winner must be between 1 and 4"

  self.roundsWinners[self.currentRound] = _winner
  self.winnersCount[_winner] += 1
  log WinnerPicked(self.currentRound, _winner)

  # we need to credit the winners balances
  # we pass winner - 1, because the pick is 1 based but the array is 0 based
  self._creditWinners(_winner - 1)

  # we only reset the `currentRoundPlayersCount`
  # because we will overide the `currentRoundPlayers` array when needed
  # this saves a lot of gas
  self.currentRoundPlayersCount = 0

  self.isPickingClosed = False
  self.currentRound += 1
  log PickingOpened(self.currentRound)

  return _winner

@external
def ownerSetTaxWallet(_address: address) -> bool:
  assert msg.sender == self.owner, "Only owner can set tax wallet"
  self.winnersTaxWallet = _address
  return True

@external
def ownerSetWinnersTax(_amount: uint256) -> bool:
  assert msg.sender == self.owner, "Only owner can set winners tax"
  assert _amount >= 0 and _amount <= 100, "Winners tax must be between 0 and 100"
  self.winnersTax = _amount
  return True

@external
def ownerSetGodfatherTax(_amount: uint256) -> bool:
  assert msg.sender == self.owner, "Only owner can set godfather tax"
  assert _amount >= 0 and _amount <= 100, "Godfather tax must be between 0 and 100"
  self.godfatherTax = _amount
  return True

@external
def emergencyOwnerUnlockGame() -> bool:
  # this method is used to refund player balances stuck in a betting-round
  # for instance if `pickWinner()` runs out of gas, we can call this method (bug in contract?)
  # better be safe than sorry, right?
  assert msg.sender == self.owner, "Only owner can unlock the game"
  assert self.currentRound > 0, "Game has not started yet"

  # unsure we pause the game
  self.isPickingClosed = True

  for i in range(MAX_PLAYERS_PER_ROUND):
    if i >= self.currentRoundPlayersCount:
      break

    player: address = self.currentRoundPlayers[i]
    lockedBalance: uint256 = self.playersLockedBalances[player]

    if lockedBalance > 0:
      self.balanceOf[player] += lockedBalance
      self.playersLockedBalances[player] = 0

  return True

@internal
def _hasPlayerPicked(_player: address) -> bool:
  arr: uint256[4] = self.roundsPlayersPicks[self.currentRound][_player]
  return arr[0] > 0 or arr[1] > 0 or arr[2] > 0 or arr[3] > 0

@internal
def _creditWinners(winner: uint256) -> bool:
  # first we need to calculate the total amount of USDT in the winning picks
  # and the total amount of losers picks
  totalWinnersBetAmount: uint256 = 0
  totalLosersBetAMount: uint256 = 0

  for i in range(MAX_PLAYERS_PER_ROUND):
    # stop loop if we reached the end of number of players in this round
    if i >= self.currentRoundPlayersCount:
      break

    # unlock the player balance
    self.playersLockedBalances[self.currentRoundPlayers[i]] = 0

    # sum the total amount of USDT in the winning picks
    player: address = self.currentRoundPlayers[i]
    playerPicks: uint256[4] = self.roundsPlayersPicks[self.currentRound][player]
    totalWinnersBetAmount += playerPicks[winner]

    #  sum the total amount of USDT in the losers picks
    playerLosses: uint256 = 0

    for i2 in range(4):
      if i2 != winner:
        playerLosses += playerPicks[i2]

    if playerLosses > 0:
      totalLosersBetAMount += playerLosses
      log PlayerLost(player, playerLosses)

  # now we need to take the winners tax
  winnersTaxAmount: uint256 = totalLosersBetAMount * self.winnersTax / 100
  totalLosersBetAMount -= winnersTaxAmount
  self.balanceOf[self.winnersTaxWallet] += winnersTaxAmount

  totalCredited: uint256 = 0

  # now re-loop to credit the winners from their percentage of the losers picks
  for i in range(MAX_PLAYERS_PER_ROUND):
    if i >= self.currentRoundPlayersCount:
      break

    player: address = self.currentRoundPlayers[i]
    playerPicks: uint256[4] = self.roundsPlayersPicks[self.currentRound][player]

    if playerPicks[winner] != 0:
      percentage: uint256 = playerPicks[winner] * 100 / totalWinnersBetAmount
      amountWon: uint256 = totalLosersBetAMount * percentage / 100

      # check for godfather
      # we remove the godfather tax from the amount won only
      # we must keep track of totalCredited for dust collection
      if self.godfathers[player] != empty(address):
        godfatherAmount: uint256 = amountWon * self.godfatherTax / 100
        amountWon -= godfatherAmount
        totalCredited += godfatherAmount
        self.balanceOf[self.godfathers[player]] += godfatherAmount

      amountToCredit: uint256 = playerPicks[winner] + amountWon
      totalCredited += amountWon
      self.balanceOf[player] += amountToCredit
      log PlayerWon(player, amountToCredit)

  # check if we have some left-overs
  if totalCredited < totalLosersBetAMount:
    dust: uint256 = totalLosersBetAMount - totalCredited
    self.balanceOf[self.winnersTaxWallet] += dust
    log DustCollected(dust)

  return True
