const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const SmarPoll = artifacts.require('SmarPoll');

const BN = web3.utils.BN;
const { ZERO_ADDRESS } = constants;

contract('SmarPoll', async function (accounts) {
  const deployer = accounts[0]; // 😎
  const thor = accounts[1];     // ⛈
  const batman = accounts[2];   // 🦇
  const superman = accounts[3]; // 🕵️‍♂️
  const ironMan = accounts[4];  // 🤖
  const hulk = accounts[5];     // 🦖

  const name = 'Next Trade';
  const pollType = 'nextTrade';

  // The bytes32 type
  const proposalNames = [
    web3.utils.soliditySha3('Approve'),
    web3.utils.soliditySha3('Request changes'),
    web3.utils.soliditySha3('Reject'),
  ];

  // Voters & Weights
  const voters = [thor, batman, superman];
  const weights = [new BN(1), new BN(1), new BN(1)];

  const SUPER_ROLE = web3.utils.soliditySha3('SUPER_ROLE');
  const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');

  let SmarPollInstance;

  beforeEach(async function () {
    SmarPollInstance = await SmarPoll.new(
      name,
      pollType,
      proposalNames,
      voters,
      weights
    );
  });

  describe('constructor', function () {
    it('vote has correct name', async function () {
      expect(await SmarPollInstance.name()).to.equal(name);
    });

    it('vote has correct poll type', async function () {
      expect(await SmarPollInstance.pollType()).to.equal(pollType);
    });

    it('vote has correct proposal names', async function () {
      expect(await SmarPollInstance.getProposals()).to.deep.equal(proposalNames);
    });

    it('vote has correct voters', async function () {
      expect(await SmarPollInstance.getVoters()).to.deep.equal(voters);
    });

    it('check if thor is voter', async function () {
      expect(await SmarPollInstance.isVoter(thor)).to.equal(true);
    });

    it('deployer has the super role', async function () {
      expect((await SmarPollInstance.getRoleMemberCount(SUPER_ROLE)).toNumber()).to.equal(1);
      expect(await SmarPollInstance.getRoleMember(SUPER_ROLE, 0)).to.equal(deployer);
    });

    it('deployer has the pauser role', async function () {
      expect((await SmarPollInstance.getRoleMemberCount(PAUSER_ROLE)).toNumber()).to.equal(1);
      expect(await SmarPollInstance.getRoleMember(PAUSER_ROLE, 0)).to.equal(deployer);
    });

    it('pauser role admin is the super role', async function () {
      expect(await SmarPollInstance.getRoleAdmin(PAUSER_ROLE)).to.equal(SUPER_ROLE);
    });
  });

  describe('granting', function () {
    const voterWeight = new BN(7);

    it('voters can give the right to cast', async function () {
      const receipt = await SmarPollInstance.giveRightToVote(ironMan, voterWeight, { from: thor });
      expectEvent(receipt, 'VoterGranted', { voter: ironMan, weight: voterWeight });

      expect((await SmarPollInstance.getWeight(ironMan)).toNumber()).to.equal(7);
    });

    it('non-voter cannot give the right to cast', async function () {
      await expectRevert(
        SmarPollInstance.giveRightToVote(ironMan, voterWeight, { from: hulk }),
        'SmarPoll: only voter can invite others'
      );
    });

    it('cannot give the right when paused', async function () {
      // Pause the poll
      await SmarPollInstance.pause({ from: deployer });

      await expectRevert(
        SmarPollInstance.giveRightToVote(ironMan, voterWeight, { from: thor }),
        'SmarPoll: give right to vote while paused'
      );
    });
  });

  describe('voting', function () {
    const ironManWeight = new BN(7);

    beforeEach(async function () {
      await SmarPollInstance.giveRightToVote(ironMan, ironManWeight, { from: thor });
    });

    it('voter has vote right', async function () {
      expect(await SmarPollInstance.canVote(ironMan)).to.equal(true);
    });

    it('hulk has not vote right', async function () {
      expect(await SmarPollInstance.canVote(hulk)).to.equal(false);
    });

    it('voter can cast the ballot', async function () {
      const proposalId = new BN(0);

      const receipt = await SmarPollInstance.vote(proposalId, { from: ironMan });
      expectEvent(receipt, 'CastVote', { from: ironMan, proposalId: proposalId, voteWeight: ironManWeight });
    });

    it('others cannot cast the ballot', async function () {
      const proposalId = new BN(0);

      const receipt = await SmarPollInstance.vote(proposalId, { from: hulk });
      expectEvent(receipt, 'TriedToVote', { from: hulk, proposalId: proposalId, voteWeight: new BN(0) });
    });

    it('voter cannot cast twice', async function () {
      const proposalId = new BN(0);

      await SmarPollInstance.vote(proposalId, { from: ironMan });
      const receipt = await SmarPollInstance.vote(proposalId, { from: ironMan });

      expectEvent(receipt, 'TriedToVote', { from: ironMan, proposalId: proposalId, voteWeight: ironManWeight });
    });

    it('voter cannot cast other proposal', async function () {
      const proposalId = new BN(7);

      const receipt = await SmarPollInstance.vote(proposalId, { from: ironMan });
      expectEvent(receipt, 'TriedToVote', { from: ironMan, proposalId: proposalId, voteWeight: ironManWeight });
    });

    it('voter can revoke vote', async function () {
      const proposalId = new BN(0);

      await SmarPollInstance.vote(proposalId, { from: ironMan });

      const receipt = await SmarPollInstance.revokeVote({ from: ironMan });
      expectEvent(receipt, 'RevokedVote', { from: ironMan, proposalId: proposalId, voteWeight: ironManWeight });
    });

    it('voter cannot revoke while not yet vote', async function () {
      await expectRevert(
        SmarPollInstance.revokeVote({ from: thor }),
        'ERC1417: voter has not yet voted.'
      );
    });

    it('all voters cast the poll', async function () {
      await SmarPollInstance.vote(new BN(0), { from: thor });
      await SmarPollInstance.vote(new BN(1), { from: batman });
      await SmarPollInstance.vote(new BN(2), { from: superman });
      await SmarPollInstance.vote(new BN(0), { from: ironMan });

      expect(await SmarPollInstance.allVote()).to.equal(true);
    });
  });

  describe('winning', function () {
    describe('weight is the same as each other', function () {
      beforeEach(async function () {
        await SmarPollInstance.giveRightToVote(ironMan, new BN(1), { from: thor });
        await SmarPollInstance.giveRightToVote(hulk, new BN(1), { from: thor });

        await SmarPollInstance.vote(new BN(0), { from: thor });
        await SmarPollInstance.vote(new BN(0), { from: batman });
        await SmarPollInstance.vote(new BN(1), { from: superman });
        await SmarPollInstance.vote(new BN(1), { from: ironMan });
        await SmarPollInstance.vote(new BN(1), { from: hulk });
      });

      it('vote has correct winning proposal id', async function () {
        const winningProposalId = 1;
        expect((await SmarPollInstance.winningProposal()).toNumber()).to.equal(winningProposalId);
      });

      it('vote has correct winning proposal name', async function () {
        const winningProposalName = proposalNames[1];
        expect(await SmarPollInstance.winningName()).to.equal(winningProposalName);
      });

      it('voter has correct weight', async function () {
        expect((await SmarPollInstance.getWeight(thor)).toNumber()).to.equal(1);
      });

      it('voter has correct vote tally', async function () {
        expect((await SmarPollInstance.getVoteTally(new BN(1))).toNumber()).to.equal(3);
      });

      it('voter has correct vote count', async function () {
        expect((await SmarPollInstance.getVoterCount(new BN(1))).toNumber()).to.equal(3);
      });

      it('voter has correct vote tallies', async function () {
        const voteTallies = await SmarPollInstance.getVoteTallies();
        expect(voteTallies.map(v => v.toNumber())).to.have.ordered.members(
          [2, 3, 0]
        );
      });

      it('voter has correct vote counts', async function () {
        const voteCounts = await SmarPollInstance.getVoterCounts();
        expect(voteCounts.map(v => v.toNumber())).to.have.ordered.members(
          [2, 3, 0]
        );
      });
    });

    describe('weight is not equal to each other', function () {
      beforeEach(async function () {
        await SmarPollInstance.giveRightToVote(ironMan, new BN(7), { from: thor });
        await SmarPollInstance.giveRightToVote(hulk, new BN(1), { from: thor });

        await SmarPollInstance.vote(new BN(1), { from: thor });
        await SmarPollInstance.vote(new BN(1), { from: batman });
        await SmarPollInstance.vote(new BN(1), { from: superman });
        await SmarPollInstance.vote(new BN(0), { from: ironMan });
        await SmarPollInstance.vote(new BN(1), { from: hulk });
      });

      it('vote has correct winning proposal id', async function () {
        const winningProposalId = 0;
        expect((await SmarPollInstance.winningProposal()).toNumber()).to.equal(winningProposalId);
      });

      it('vote has correct winning proposal name', async function () {
        const winningProposalName = proposalNames[0];
        expect(await SmarPollInstance.winningName()).to.equal(winningProposalName);
      });
    });
  });

  describe('pausing', function () {
    it('deployer can pause', async function () {
      const receipt = await SmarPollInstance.pause({ from: deployer });
      expectEvent(receipt, 'Paused', { account: deployer });

      expect(await SmarPollInstance.paused()).to.equal(true);
    });

    it('other accounts cannot pause', async function () {
      await expectRevert(
        SmarPollInstance.pause({ from: hulk }),
        'SmarPoll: must have pauser role to pause'
      );
    });

    it('deployer can unpause', async function () {
      await SmarPollInstance.pause({ from: deployer });

      const receipt = await SmarPollInstance.unpause({ from: deployer });
      expectEvent(receipt, 'Unpaused', { account: deployer });

      expect(await SmarPollInstance.paused()).to.equal(false);
    });

    it('other accounts cannot unpause', async function () {
      await SmarPollInstance.pause({ from: deployer });

      await expectRevert(
        SmarPollInstance.unpause({ from: hulk }),
        'SmarPoll: must have pauser role to unpause'
      );
    });

    it('cannot vote while paused', async function () {
      await SmarPollInstance.pause({ from: deployer });

      await expectRevert(
        SmarPollInstance.vote(new BN(0), { from: thor }),
        'ERC1417Pausable: vote cast while paused'
      );
    });

    it('other accounts cannot pause', async function () {
      await expectRevert(
        SmarPollInstance.pause({ from: thor }),
        'SmarPoll: must have pauser role to pause'
      );
    });
  });
});
