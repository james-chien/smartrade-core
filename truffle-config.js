/**
 *
 * To deploy via Infura you'll need a wallet provider to sign your transactions
 * before they're sent to a remote public node. Infura accounts are available
 * for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const HDWalletProvider = require('@truffle/hdwallet-provider');

const fs = require('fs');

let infuraKey = null;
let mnemonic = null;

if (fs.existsSync('.infurakey')) {
  infuraKey = fs.readFileSync('.infurakey').toString().trim();
}
if (fs.existsSync('.mnemonic')) {
  mnemonic = fs.readFileSync('.mnemonic').toString().trim();
}

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 7545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
    },

    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/${infuraKey}`),
      network_id: 3,          // Ropsten's id
      gas: 5500000,           // Ropsten has a lower block limit than mainnet
      // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      // skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    enableTimeouts: false,
    // timeout: 100000
  },

  // Configure your compilers
  // See https://solidity.readthedocs.io/en/latest/using-the-compiler.html
  compilers: {
    solc: {
      version: "0.6.12",   // Fetch exact version from solc-bin (default: truffle's version)
      docker: false,       // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        /*
        debug: {
          revertStrings: "debug"   // "default", "strip" and "debug"
        },
        */
        // evmVersion: "byzantium"
      }
    }
  },

  // Truffle plugins
  plugins: [
    "solidity-coverage"
  ]
}
