from vyper.interfaces import ERC20

event Deposit:
  user: indexed(address)
  amount: uint256

event Withdraw:
  user: indexed(address)
  amount: uint256

name: public(String[32])
balanceOf: public(HashMap[address, uint256])
owner: public(address)

bridgedCoin: public(ERC20)

@external
def __init__(_bridgedCoin: address):
  assert _bridgedCoin != empty(address), "Invalid bridged coin address"
  self.name = "SonicGameBridge"
  self.owner = msg.sender
  self.bridgedCoin = ERC20(_bridgedCoin)

@external
@nonreentrant("deposit")
def deposit(_amount: uint256) -> bool:
  self.balanceOf[msg.sender] += _amount
  self.bridgedCoin.transferFrom(msg.sender, self, _amount)
  log Deposit(msg.sender, _amount)
  return True

@external
@nonreentrant("ownerWithdraw")
def ownerWithdrawTo(_recipient: address, _amount: uint256) -> bool:
  assert msg.sender == self.owner, "Only the owner can withdraw"
  assert self.balanceOf[_recipient] >= _amount, "Insufficient balance"
  self.balanceOf[_recipient] -= _amount
  self.bridgedCoin.transfer(_recipient, _amount)
  log Withdraw(_recipient, _amount)
  return True
