const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const REToken = artifacts.require('REToken');

const BN = web3.utils.BN;
const { ZERO_ADDRESS } = constants;

contract('REToken', async (accounts) => {
  const deployer = accounts[0]; // 😎
  const thor = accounts[1];     // ⛈

  const name = 'REToken';
  const symbol = 'STRE';
  const baseURI = 'https://smartrade.network/';

  const SUPER_ROLE = web3.utils.soliditySha3('SUPER_ROLE');
  const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE');
  const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');

  let RETokenInstance;

  beforeEach(async function () {
    RETokenInstance = await REToken.new(name, symbol, baseURI);
  });

  describe('constructor', function () {
    it('token has correct name', async function () {
      expect(await RETokenInstance.name()).to.equal(name);
    });

    it('token has correct symbol', async function () {
      expect(await RETokenInstance.symbol()).to.equal(symbol);
    });

    it('token has correct base URI', async function () {
      expect(await RETokenInstance.baseURI()).to.equal(baseURI);
    });

    it('deployer has the super role', async function () {
      expect((await RETokenInstance.getRoleMemberCount(SUPER_ROLE)).toNumber()).to.equal(1);
      expect(await RETokenInstance.getRoleMember(SUPER_ROLE, 0)).to.equal(deployer);
    });

    it('deployer has the minter role', async function () {
      expect((await RETokenInstance.getRoleMemberCount(MINTER_ROLE)).toNumber()).to.equal(1);
      expect(await RETokenInstance.getRoleMember(MINTER_ROLE, 0)).to.equal(deployer);
    });

    it('deployer has the pauser role', async function () {
      expect((await RETokenInstance.getRoleMemberCount(PAUSER_ROLE)).toNumber()).to.equal(1);
      expect(await RETokenInstance.getRoleMember(PAUSER_ROLE, 0)).to.equal(deployer);
    });

    it('minter role admin is the super role', async function () {
      expect(await RETokenInstance.getRoleAdmin(MINTER_ROLE)).to.equal(SUPER_ROLE);
    });
  });

  describe('minting', function () {
    it('deployer can mint tokens', async function () {
      const tokenId = new BN(0);

      const receipt = await RETokenInstance.mint(thor, { from: deployer });
      expectEvent(receipt, 'Transfer', { from: ZERO_ADDRESS, to: thor, tokenId });

      expect((await RETokenInstance.balanceOf(thor)).toNumber()).to.equal(1);
      expect(await RETokenInstance.ownerOf(tokenId)).to.equal(thor);

      expect(await RETokenInstance.tokenURI(tokenId)).to.equal(baseURI + tokenId);
    });

    it('other accounts cannot mint tokens', async function () {
      await expectRevert(
        RETokenInstance.mint(thor, { from: thor }),
        'REToken: must have minter or super role to mint'
      );
    });
  });

  describe('burning', function () {
    it('deployer can burn tokens', async function () {
      const tokenId = new BN(0);

      await RETokenInstance.mint(deployer, { from: deployer });
      const receipt = await RETokenInstance.burn(tokenId, { from: deployer });

      expectEvent(receipt, 'Transfer', { from: deployer, to: ZERO_ADDRESS, tokenId });

      expect((await RETokenInstance.balanceOf(deployer)).toNumber()).to.equal(0);
      expect((await RETokenInstance.totalSupply()).toNumber()).to.equal(0);
    });

    it('other accounts cannot burn tokens', async function () {
      const tokenId = new BN(0);

      await RETokenInstance.mint(thor, { from: deployer });

      await expectRevert(
        RETokenInstance.burn(tokenId, { from: thor }),
        'REToken: must have super role to burn'
      );
    });
  });

  describe('URI', function () {
    it('deployer can set token URI', async function () {
      const tokenId = new BN(0);
      const otherUri = 'otheruri';

      await RETokenInstance.mint(deployer, { from: deployer });
      await RETokenInstance.setTokenURI(tokenId, otherUri, { from: deployer });

      expect(await RETokenInstance.tokenURI(tokenId)).to.equal(baseURI + otherUri);
    });

    it('other accounts cannot set token URI', async function () {
      const tokenId = new BN(0);
      const otherUri = 'otheruri';

      await RETokenInstance.mint(thor, { from: deployer });

      await expectRevert(
        RETokenInstance.setTokenURI(tokenId, otherUri, { from: thor }),
        'REToken: must have super role to set token URI'
      );
    });

    it('deployer can set base URI', async function () {
      const otherBaseUri = 'https://other.base.uri/';

      await RETokenInstance.setBaseURI(otherBaseUri, { from: deployer });

      expect(await RETokenInstance.baseURI()).to.equal(otherBaseUri);
    });

    it('other accounts cannot set base URI', async function () {
      const otherBaseUri = 'https://other.base.uri/';

      await expectRevert(
        RETokenInstance.setBaseURI(otherBaseUri, { from: thor }),
        'REToken: must have super role to set base URI'
      );
    });
  });

  describe('pausing', function () {
    it('deployer can pause', async function () {
      const receipt = await RETokenInstance.pause({ from: deployer });
      expectEvent(receipt, 'Paused', { account: deployer });

      expect(await RETokenInstance.paused()).to.equal(true);
    });

    it('deployer can unpause', async function () {
      await RETokenInstance.pause({ from: deployer });

      const receipt = await RETokenInstance.unpause({ from: deployer });
      expectEvent(receipt, 'Unpaused', { account: deployer });

      expect(await RETokenInstance.paused()).to.equal(false);
    });

    it('cannot mint while paused', async function () {
      await RETokenInstance.pause({ from: deployer });

      await expectRevert(
        RETokenInstance.mint(thor, { from: deployer }),
        'ERC721Pausable: token transfer while paused'
      );
    });

    it('other accounts cannot pause', async function () {
      await expectRevert(
        RETokenInstance.pause({ from: thor }),
        'REToken: must have pauser or super role to pause'
      );
    });
  });
});
