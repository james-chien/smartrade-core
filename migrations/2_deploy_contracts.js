const Web3 = require('web3');
const _ = require('lodash');

const REToken = artifacts.require('./tokens/REToken.sol');
const SmarTradeRegistry = artifacts.require('./SmarTradeRegistry.sol');
const SmarTradeFactory = artifacts.require('./trade/SmarTradeFactory.sol');

const BN = Web3.utils.BN;

module.exports = async (deployer, network, accounts) => {
  const creator = accounts[0];
  let tokenBaseUrl = 'https://smartrade.network/';

  if (network == 'development') {
    tokenBaseUrl = 'http://localhost:13000/';
  }

  deployer
    .deploy(REToken, 'REToken', 'STRE', tokenBaseUrl, { from: creator });

  return deployer
    .deploy(SmarTradeRegistry, { from: creator })
    .then(() => {
      return SmarTradeRegistry.deployed().then((registry) => {
        return deployer
          .deploy(SmarTradeFactory, registry.address, { from: creator })
          .then(() => {
            return SmarTradeFactory.deployed().then(async (factory) => {
              const registryAddress = await factory.getRegistryAddress();
              // console.log({ registryAddress });
            });
          });
      });
    })
    .then(() => {
      return REToken.deployed().then(async (token) => {
        // seed prominent houses for demo
        for (const index of _.range(20)) {
          await token.mint(creator, { from: creator });
        }
      });
    })
    .then(() => {
      //
    });
};
