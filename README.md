# RustyTaintChain

The current implementation is based on
https://github.com/gcarq/rusty-blockparser .
A BlockSci implementation will be coming out shortly.

---------------

A court in 1816 had to tackle the problem of good and bad funds mixing
through an account after a bank went bust. Which deposits to an
account were to be matched with which later withdrawals? The Master of
the Rolls, one of the most senior judges in Engand, established a
simple rule of first-in-first-out (FIFO): the withdrawals from an
account are deemed to be drawn in order against the deposits first
made to it.

FIFO is not just the legal way to track funds, but is also effective,
as it is deterministic and lossless, leading to efficient
implementation. Our software provides such an implementation of FIFO for the
bitcoin blockchain.

Before getting into the details, it may be worth worth answering a few
frequently asked question:

## The order of transactions in the block is arbitrary, so why arbitrarily assign meaning to it?

A number of people have argued that there is no meaning in the
ordering, but this is not really true. The coinbase transaction has to
follow the block maturity rule, stopping it from being used in the
same block, and the transaction outputs can be used by other
transactions within the same block only so long as they appear before
the place are used in the block. Thus there is indeed ordering and
timing information within blocks.

## What happens with fees in Bitcoin when FIFO is applied? Do miners get tainted fees?

In Bitcoin the mining fee gets paid out in the coinbase transaction,
along with the block reward. There is also the issue of what happens
when the miners burning the fees or the reward. Luckily, the law has a
simple answer here: if someone steals your horse and kills it, he
still owes you a horse. So the only reasonable interpretation that the
transaction outputs get paid first, in the order in which the
transactions are listed, and then the rest is given to the miners.
Only a few hundred bitcoins of the rewards are burnt, and as of June 2018, there
are no transactions in which the fee plus the reward fail to cover the
fees.

## What happens when coins reported stolen are already tainted?

The second victim did not own the coins, as there is no statute of
limitations for theft. So when the taint comes as input and collides
with another reported taint, the first taint is saved and any
subsequent taint gets ignored.

---------------
## How to run?

In order to run FIFO you need to register the callback from the repo with the rust parser in src/main.rs and add an import to src/callbacks/mod.rs.  

The script expects a file to be passed to it, that contains the information about the initial taint values (currently uses --address-file flag)
The transaction file currently has the following format:

tx, [taint type, taint value]

where the [..] corresponds to sequential appearence of taint for UTXOs!. E.g. if you have a transaction (txDEAD_BEEF) with 3 satoshi outputs: 1, 1, 1 and you want to say that first one is clean and two after are dirty you would write it as

txDEAD_BEEF, Clean, 1, Dirty, 2

It is often the case, that you have addresses and you want to track the money movement. 
In such cases we found it useful to generate the addresses file in such a way that original addresses become the taint type and every tx made by those addresses get trainted with the address type. 

