const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const SmarTradeRegistry = artifacts.require('SmarTradeRegistry');

const BN = web3.utils.BN;
const { ZERO_ADDRESS } = constants;

contract('SmarTradeRegistry', async function (accounts) {
  const deployer = accounts[0]; // 😎
  const thor = accounts[1];     // ⛈
  const batman = accounts[2];   // 🦇

  const tradeContract = '0xcF345B6aFD6DE1f205C2b9Ccd03217AC0f5E7ca2';
  const factoryContract = '0x64F70539776f08C5EF505254C2426F3e47A5204A';

  const SUPER_ROLE = web3.utils.soliditySha3('SUPER_ROLE');
  const DELEGATOR_ROLE = web3.utils.soliditySha3('DELEGATOR_ROLE');

  let SmarTradeRegistryInstance;

  beforeEach(async function () {
    SmarTradeRegistryInstance = await SmarTradeRegistry.new();
  });

  describe('constructor', function () {
    it('deployer has the super role', async function () {
      expect((await SmarTradeRegistryInstance.getRoleMemberCount(SUPER_ROLE)).toNumber()).to.equal(1);
      expect(await SmarTradeRegistryInstance.getRoleMember(SUPER_ROLE, 0)).to.equal(deployer);
    });
  });

  describe('contract', function () {
    it('other account cannot add contract to whitelist', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.addContractToWhiteList(tradeContract, { from: thor }),
        'SmarTradeRegistry: must have delegator or super role to add contract to whitelist'
      );
    });

    it('contract cannot be zero address', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.addContractToWhiteList(ZERO_ADDRESS, { from: deployer }),
        'SmarTradeRegistry: contract cannot be the zero address'
      );
    });

    it('deployer can add contract to whitelist', async function () {
      const registry = await SmarTradeRegistryInstance.addContractToWhiteList(tradeContract, { from: deployer });
      expectEvent(registry, 'ContractAdded', { contractAddress: tradeContract, creator: deployer });

      expect(await SmarTradeRegistryInstance.getContractWhiteList()).to.deep.equal([tradeContract]);
      expect(await SmarTradeRegistryInstance.isContractWhiteListed(tradeContract)).to.equal(true);
    });

    it('delegator can add contract to whitelist', async function () {
      await SmarTradeRegistryInstance.grantRole(DELEGATOR_ROLE, thor);

      const registry = await SmarTradeRegistryInstance.addContractToWhiteList(tradeContract, { from: thor });
      expectEvent(registry, 'ContractAdded', { contractAddress: tradeContract, creator: thor});

      expect(await SmarTradeRegistryInstance.getContractWhiteList()).to.deep.equal([tradeContract]);
    });

    it('cannot add duplicate contract to whitelist', async function () {
      await SmarTradeRegistryInstance.addContractToWhiteList(tradeContract, { from: deployer });

      await expectRevert(
        SmarTradeRegistryInstance.addContractToWhiteList(tradeContract, { from: deployer }),
        'SmarTradeRegistry: contract must not exists'
      );
    });

    it('other account cannot remove contract from whitelist', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.removeContractFromWhiteList(tradeContract, { from: thor }),
        'SmarTradeRegistry: must have super role to remove contract from whitelist'
      );
    });

    it('contract cannot be zero address', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.removeContractFromWhiteList(ZERO_ADDRESS, { from: deployer }),
        'SmarTradeRegistry: contract cannot be the zero address'
      );
    });

    it('cannot remove non-existent contract', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.removeContractFromWhiteList(tradeContract, { from: deployer }),
        'SmarTradeRegistry: contract must exists'
      );
    });

    it('deployer can remove contract', async function () {
      await SmarTradeRegistryInstance.addContractToWhiteList(tradeContract, { from: deployer });

      const registry = await SmarTradeRegistryInstance.removeContractFromWhiteList(tradeContract, { from: deployer });
      expectEvent(registry, 'ContractRemoved', { contractAddress: tradeContract, remover: deployer});

      expect(await SmarTradeRegistryInstance.getContractWhiteList()).to.deep.equal([]);
    });
  });

  describe('factory', function () {
    it('other account cannot add factory to whitelist', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.addFactoryToWhiteList(factoryContract, { from: thor }),
        'SmarTradeRegistry: must have super role to add factory to whitelist'
      );
    });

    it('factory cannot be zero address', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.addFactoryToWhiteList(ZERO_ADDRESS, { from: deployer }),
        'SmarTradeRegistry: factory cannot be the zero address'
      );
    });

    it('deployer can add factory to whitelist', async function () {
      const registry = await SmarTradeRegistryInstance.addFactoryToWhiteList(factoryContract, { from: deployer });
      expectEvent(registry, 'FactoryAdded', { factoryAddress: factoryContract, creator: deployer });

      expect(await SmarTradeRegistryInstance.getFactoryWhiteList()).to.deep.equal([factoryContract]);
      expect(await SmarTradeRegistryInstance.isFactoryWhiteListed(factoryContract)).to.equal(true);
    });

    it('cannot add duplicate factory to whitelist', async function () {
      await SmarTradeRegistryInstance.addFactoryToWhiteList(factoryContract, { from: deployer });

      await expectRevert(
        SmarTradeRegistryInstance.addFactoryToWhiteList(factoryContract, { from: deployer }),
        'SmarTradeRegistry: factory must not exists'
      );
    });

    it('other account cannot remove factory from whitelist', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.removeFactoryFromWhiteList(factoryContract, { from: thor }),
        'SmarTradeRegistry: must have super role to remove factory from whitelist'
      );
    });

    it('factory cannot be zero address', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.removeFactoryFromWhiteList(ZERO_ADDRESS, { from: deployer }),
        'SmarTradeRegistry: factory cannot be the zero address'
      );
    });

    it('cannot remove non-existent factory', async function () {
      await expectRevert(
        SmarTradeRegistryInstance.removeFactoryFromWhiteList(factoryContract, { from: deployer }),
        'SmarTradeRegistry: factory must exists'
      );
    });

    it('deployer can remove factory', async function () {
      await SmarTradeRegistryInstance.addFactoryToWhiteList(factoryContract, { from: deployer });

      const registry = await SmarTradeRegistryInstance.removeFactoryFromWhiteList(factoryContract, { from: deployer });
      expectEvent(registry, 'FactoryRemoved', { factoryAddress: factoryContract, remover: deployer});

      expect(await SmarTradeRegistryInstance.getFactoryWhiteList()).to.deep.equal([]);
    });
  });
});
