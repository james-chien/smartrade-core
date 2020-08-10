const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const _ = require('lodash');

const ExpressTrade = artifacts.require('ExpressTrade');
const SmarPoll = artifacts.require('SmarPoll');

const BN = web3.utils.BN;
const { ZERO_ADDRESS } = constants;

contract('ExpressTrade', async (accounts) => {
  const deployer = accounts[0]; // 😎
  const thor = accounts[1];     // ⛈
  const batman = accounts[2];   // 🦇
  const superman = accounts[3]; // 🕵️‍♂️
  const ironMan = accounts[4];  // 🤖
  const hulk = accounts[5];     // 🦖

  const tradeName = 'The White House for sale';
  const tradeType = 'realEstate';

  const participants = [
    thor,
    batman,
    superman,
  ];

  const baseURI = 'https://ipfs.infura.io:5001/api/v0/block/get?arg=';
  const ipfsHash = 'QmQuUxc9qwnbuu1UMeTHUiKR9c9M6jU4GXQkdeq2Aah8R2';

  const SUPER_ROLE = web3.utils.soliditySha3('SUPER_ROLE');
  const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');

  let ExpressTradeInstance;

  beforeEach(async function () {
    ExpressTradeInstance = await ExpressTrade.new(
      tradeName,
      tradeType,
      participants,
      ZERO_ADDRESS
    );
  });

  describe('constructor', function () {
    it('trade has correct id', async () => {
      expect((await ExpressTradeInstance.tradeId()).toNumber()).to.equal(0);
    });

    it('trade has correct name', async () => {
      expect(await ExpressTradeInstance.tradeName()).to.equal(tradeName);
    });

    it('trade has correct type', async () => {
      expect(await ExpressTradeInstance.tradeType()).to.equal(tradeType);
    });

    it('trade has correct participants', async () => {
      expect(await ExpressTradeInstance.getParticipants()).to.deep.equal(participants);
    });

    it('deployer has the super role', async function () {
      expect((await ExpressTradeInstance.getRoleMemberCount(SUPER_ROLE)).toNumber()).to.equal(1);
      expect(await ExpressTradeInstance.getRoleMember(SUPER_ROLE, 0)).to.equal(deployer);
    });

    it('deployer has the pauser role', async function () {
      expect((await ExpressTradeInstance.getRoleMemberCount(PAUSER_ROLE)).toNumber()).to.equal(1);
      expect(await ExpressTradeInstance.getRoleMember(PAUSER_ROLE, 0)).to.equal(deployer);
    });

    it('pauser role admin is the super role', async function () {
      expect(await ExpressTradeInstance.getRoleAdmin(PAUSER_ROLE)).to.equal(SUPER_ROLE);
    });
  });

  describe('ipfs', function () {
    beforeEach(async function () {
      ExpressTradeInstance.setBaseURI(baseURI);
      ExpressTradeInstance.setIPFSHash(ipfsHash);
    });

    it('trade has correct base URI', async () => {
      expect(await ExpressTradeInstance.baseURI()).to.equal(baseURI);
    });

    it('trade has correct IPFS hash', async () => {
      expect(await ExpressTradeInstance.getIPFSHash()).to.equal(ipfsHash);
    });

    it('trade has correct IPFS storage URI', async () => {
      expect(await ExpressTradeInstance.getStorage()).to.equal(baseURI + ipfsHash);
    });

    it('trade has correct IPFS storage URI without base URI', async () => {
      ExpressTradeInstance.setBaseURI("", { from: deployer });
      expect(await ExpressTradeInstance.getStorage()).to.equal(ipfsHash);
    });

    it('other accounts cannot set IPFS hash', async () => {
      const ipfsHash = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR';

      await expectRevert(
        ExpressTradeInstance.setIPFSHash(ipfsHash, { from: hulk }),
        'ExpressTrade: must have super role'
      );
    });

    it('other accounts cannot set IPFS base URI', async () => {
      const baseURI = 'https://ipfs.io/ipfs';

      await expectRevert(
        ExpressTradeInstance.setBaseURI(baseURI, { from: hulk }),
        'ExpressTrade: must have super role'
      );
    });
  });

  describe('poll', function () {
    const pollName = 'Next Trade';
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

    const nextTradeProposal = 0;

    let SmarPollInstance;

    beforeEach(async function () {
      SmarPollInstance = await SmarPoll.new(
        pollName,
        pollType,
        proposalNames,
        voters,
        weights
      );
    });

    it('other accounts cannot create poll', async () => {
      await expectRevert(
        ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: ironMan }),
        'ExpressTrade: only super role can create poll'
      );
    });

    it('super role can create poll', async () => {
      const receipt = await ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: deployer });
      const newPoll = await ExpressTradeInstance.getPoll();

      expectEvent(receipt, 'PollCreated', { poll: newPoll });

      expect(await ExpressTradeInstance.getPoll()).to.equal(SmarPollInstance.address);
    });

    it('cannot create zero address poll', async () => {
      await expectRevert(
        ExpressTradeInstance.createPoll(ZERO_ADDRESS, new BN(nextTradeProposal), { from: deployer }),
        'SmarTrade: the poll is the zero address'
      );
    });

    it('cannot create non-ERC1417 poll', async () => {
      const nonERC1417Poll = hulk;

      await expectRevert(
        ExpressTradeInstance.createPoll(nonERC1417Poll, new BN(nextTradeProposal), { from: deployer }),
        'SmarTrade: need to conform to ERC1417'
      );
    });

    it('cannot create poll more than once', async () => {
      await ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: deployer });

      await expectRevert(
        ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: deployer }),
        'SmarTrade: can only create poll once'
      );
    });

    it('cannot create poll when paused', async () => {
      await ExpressTradeInstance.pause();

      await expectRevert(
        ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: deployer }),
        'ExpressTrade: create poll while paused'
      );
    });

    it('can create next trade when all vote the poll', async () => {
      await ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: deployer });

      await SmarPollInstance.vote(new BN(0), { from: thor });
      await SmarPollInstance.vote(new BN(0), { from: batman });
      await SmarPollInstance.vote(new BN(1), { from: superman });

      expect(await ExpressTradeInstance.canCreateNextTrade()).to.equal(true);
    });

    it('can create next trade without any poll', async () => {
      expect(await ExpressTradeInstance.canCreateNextTrade()).to.equal(true);
    });

    it('cannot create next trade when partial vote the poll', async () => {
      await ExpressTradeInstance.createPoll(SmarPollInstance.address, new BN(nextTradeProposal), { from: deployer });
      await SmarPollInstance.vote(new BN(0), { from: thor });

      expect(await ExpressTradeInstance.canCreateNextTrade()).to.equal(false);
    });
  });

  describe('child trade', function () {
    const childTradeName = 'The White House for rent';

    let ChildExpressTradeInstance;

    beforeEach(async function () {
      ChildExpressTradeInstance = await ExpressTrade.new(
        tradeName,
        tradeType,
        participants,
        ExpressTradeInstance.address
      );
    });

    it('trade has correct child trade', async () => {
      ExpressTradeInstance.setChildTrade(ChildExpressTradeInstance.address);
      expect(await ExpressTradeInstance.getChildTrade()).to.equal(ChildExpressTradeInstance.address);
    });

    it('trade has correct parent trade', async () => {
      expect(await ChildExpressTradeInstance.getParentTrade()).to.equal(ExpressTradeInstance.address);
    });

    it('other accounts cannot set child trade', async () => {
      await expectRevert(
        ExpressTradeInstance.setChildTrade(ChildExpressTradeInstance.address, { from: hulk }),
        'ExpressTrade: must have super role'
      );
    });

    it('cannot set zero address child trade', async function () {
      await expectRevert(
        ExpressTradeInstance.setChildTrade(ZERO_ADDRESS, { from: deployer }),
        'SmarTrade: cannot be the zero address'
      );
    });

    it('cannot set non-contract child trade', async function () {
      const nonContractTrade = hulk;

      await expectRevert(
        ExpressTradeInstance.setChildTrade(nonContractTrade, { from: deployer }),
        'SmarTrade: must be contract'
      );
    });

    it('cannot set child trade more than once', async function () {
      await ExpressTradeInstance.setChildTrade(ChildExpressTradeInstance.address, { from: deployer });

      await expectRevert(
        ExpressTradeInstance.setChildTrade(ChildExpressTradeInstance.address, { from: deployer }),
        'SmarTrade: child trade has already been set'
      );
    });

    it('can set child trade', async function () {
      const receipt = await ExpressTradeInstance.setChildTrade(ChildExpressTradeInstance.address, { from: deployer });
      expectEvent(receipt, 'NextTrade', { trade: ChildExpressTradeInstance.address });
    });
  });

  describe('pausing', function () {
    it('deployer can pause', async function () {
      const receipt = await ExpressTradeInstance.pause({ from: deployer });
      expectEvent(receipt, 'Paused', { account: deployer });

      expect(await ExpressTradeInstance.paused()).to.equal(true);
    });

    it('other accounts cannot pause', async function () {
      await expectRevert(
        ExpressTradeInstance.pause({ from: ironMan }),
        'ExpressTrade: must have pauser role to pause'
      );
    });

    it('deployer can unpause', async function () {
      await ExpressTradeInstance.pause({ from: deployer });

      const receipt = await ExpressTradeInstance.unpause({ from: deployer });
      expectEvent(receipt, 'Unpaused', { account: deployer });

      expect(await ExpressTradeInstance.paused()).to.equal(false);
    });

    it('other accounts cannot unpause', async function () {
      await ExpressTradeInstance.pause({ from: deployer });

      await expectRevert(
        ExpressTradeInstance.unpause({ from: hulk }),
        'ExpressTrade: must have pauser role to unpause'
      );
    });
  });
});
