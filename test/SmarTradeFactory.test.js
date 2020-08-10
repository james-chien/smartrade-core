const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
var _ = require('lodash');

const SmarTradeRegistry = artifacts.require('SmarTradeRegistry');
const SmarTradeFactory = artifacts.require('SmarTradeFactory');
const ExpressTrade = artifacts.require('ExpressTrade');
const SmarPoll = artifacts.require('SmarPoll');

const BN = web3.utils.BN;
const { ZERO_ADDRESS } = constants;

contract('SmarTradeFactory', async function (accounts) {
  const deployer = accounts[0]; // 😎
  const thor = accounts[1];     // ⛈
  const batman = accounts[2];   // 🦇
  const superman = accounts[3]; // 🕵️‍♂️

  const fakeRegistryContract = '0x64F70539776f08C5EF505254C2426F3e47A5204A';

  const SUPER_ROLE = web3.utils.soliditySha3('SUPER_ROLE');
  const DELEGATOR_ROLE = web3.utils.soliditySha3('DELEGATOR_ROLE');

  let SmarTradeRegistryInstance;
  let SmarTradeFactoryInstance;

  beforeEach(async function () {
    SmarTradeRegistryInstance = await SmarTradeRegistry.new();
    SmarTradeFactoryInstance = await SmarTradeFactory.new(SmarTradeRegistryInstance.address);

    await SmarTradeRegistryInstance.grantRole(DELEGATOR_ROLE, SmarTradeFactoryInstance.address, { from: deployer });
  });

  describe('constructor', function () {
    it('registry cannot be the zero address', async function () {
      await expectRevert(
        SmarTradeFactory.new(ZERO_ADDRESS),
        'SmarTradeFactory: cannot be the zero address'
      );
    });

    it('registry must be contract', async function () {
      await expectRevert(
        SmarTradeFactory.new(thor),
        'SmarTradeFactory: must be contract'
      );
    });

    it('factory has correct registry', async function () {
      expect(await SmarTradeFactoryInstance.getRegistryAddress()).to.equal(SmarTradeRegistryInstance.address);
    });

    it('deployer has the super role', async function () {
      expect((await SmarTradeFactoryInstance.getRoleMemberCount(SUPER_ROLE)).toNumber()).to.equal(1);
      expect(await SmarTradeFactoryInstance.getRoleMember(SUPER_ROLE, 0)).to.equal(deployer);
    });
  });

  describe('registry', function () {
    let OtherSmarTradeRegistryInstance;

    beforeEach(async function () {
      OtherSmarTradeRegistryInstance = await SmarTradeRegistry.new();
    });

    it('other account cannot set registry', async function () {
      await expectRevert(
        SmarTradeFactoryInstance.setRegistryAddress(OtherSmarTradeRegistryInstance.address, { from: thor }),
        'SmarTradeFactory: must have super role'
      );
    });

    it('deployer cannot set zero address to registry', async function () {
      await expectRevert(
        SmarTradeFactoryInstance.setRegistryAddress(ZERO_ADDRESS, { from: deployer }),
        'SmarTradeFactory: cannot be the zero address'
      );
    });

    it('deployer cannot set pure address to registry', async function () {
      await expectRevert(
        SmarTradeFactoryInstance.setRegistryAddress(fakeRegistryContract, { from: deployer }),
        'SmarTradeFactory: must be contract'
      );
    });

    it('deployer can set registry', async function () {
      const receipt = await SmarTradeFactoryInstance.setRegistryAddress(OtherSmarTradeRegistryInstance.address, { from: deployer });
      expectEvent(receipt, 'RegistryChanged', { setter: deployer, registry: OtherSmarTradeRegistryInstance.address });

      expect(await SmarTradeFactoryInstance.getRegistryAddress()).to.equal(OtherSmarTradeRegistryInstance.address);
    });
  });

  describe('deploy', function () {
    const tradeName = 'The White House for sale';
    const tradeType = 'realEstate';

    const childTradeName = 'The White House for rent';
    const childTradeType = 'realEstate';

    // Poll data
    const pollName = 'Next Trade';
    const pollType = 'nextTrade';

    // The bytes32 type
    const proposalNames = [
      web3.utils.soliditySha3('Approve'),
      web3.utils.soliditySha3('Request changes'),
      web3.utils.soliditySha3('Reject'),
    ];

    // Voters & Weights
    const voters = [batman, superman];
    const weights = [new BN(1), new BN(1)];

    const nextTradeProposal = new BN(1);

    const participants = [
      thor,
      batman,
      superman
    ];

    const SUPER_ROLE = web3.utils.soliditySha3('SUPER_ROLE');

    let ExpressTradeInstance;
    let ChildTradeInstance;

    beforeEach(async function () {
      ExpressTradeInstance = await ExpressTrade.new(
        tradeName,
        tradeType,
        participants,
        ZERO_ADDRESS
      );

      ChildTradeInstance = await ExpressTrade.new(
        tradeName,
        tradeType,
        participants,
        ExpressTradeInstance.address
      );

      ExpressTradeInstance.grantRole(SUPER_ROLE, SmarTradeFactoryInstance.address);
      ChildTradeInstance.grantRole(SUPER_ROLE, SmarTradeFactoryInstance.address);
    });

    it('other accounts cannot deploy trade contract', async function () {
      await expectRevert(
        SmarTradeFactoryInstance.deploySmarTrade(
          ExpressTradeInstance.address,
          ZERO_ADDRESS,
          { from: superman }
        ),
        'SmarTradeFactory: must have super role'
      );
    });

    it('can deploy trade contract', async function () {
      const receipt = await SmarTradeFactoryInstance.deploySmarTrade(
        ExpressTradeInstance.address,
        ZERO_ADDRESS,
        { from: deployer }
      );

      expectEvent(receipt, 'TradeCreated', { creator: deployer, newTrade: ExpressTradeInstance.address });
    });

    describe('deploy child trade', function () {
      let parentContract;

      beforeEach(async function () {
        await SmarTradeFactoryInstance.deploySmarTrade(
          ExpressTradeInstance.address,
          ZERO_ADDRESS,
          { from: deployer }
        );

        parentContract = ExpressTradeInstance.address;
      });

      it('can deploy trade contract', async function () {
        const receipt = await SmarTradeFactoryInstance.deploySmarTrade(
          ChildTradeInstance.address,
          parentContract,
          { from: deployer }
        );

        expectEvent(receipt, 'TradeCreated', { creator: deployer, newTrade: ChildTradeInstance.address });
      });

      it('can deploy voting trade contract', async function () {
        const SmarPollInstance = await SmarPoll.new(
          pollName,
          pollType,
          proposalNames,
          voters,
          weights
        );

        const poll = SmarPollInstance.address;

        const receipt = await SmarTradeFactoryInstance.deployVotingSmarTrade(
          ChildTradeInstance.address,
          parentContract,
          poll,
          nextTradeProposal,
          { from: deployer }
        );

        expectEvent(receipt, 'TradeCreated', { creator: deployer, newTrade: ChildTradeInstance.address });
        expect(await ChildTradeInstance.getPoll()).to.equal(poll);
      });
    });
  });
});
