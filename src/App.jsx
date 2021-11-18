import { useEffect, useState, useCallback } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";
import idl from "./idl.json";
import keypair from "./keypair.json";
import { isURL } from "validator";
import { Wallet } from "./components/Wallets";

require("@solana/wallet-adapter-react-ui/styles.css");

// Constants
const MY_TWITTER_HANDLE = "serj_mig";
const TWITTER_HANDLE = "_buildspace";

const { SystemProgram, Keypair } = web3;

const secretArr = Object.values(keypair._keypair.secretKey);
const uInt8Secret = new Uint8Array(secretArr);
let baseAccount = Keypair.fromSecretKey(uInt8Secret);

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl("devnet");

const opts = {
  preflightCommitment: "processed",
};

const App = () => {
  const buildTwitterLink = (handle) => `https://twitter.com/${handle}`;
  const buildSolanaAccountLink = (account) =>
    `https://explorer.solana.com/address/${account}`;
  const shortenAddress = (address) => {
    if (address && address.length > 15) {
      return (
        address.substring(0, 5) + "..." + address.substring(address.length - 5)
      );
    }
  };

  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifs, setGifs] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom Wallet");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            `Connected with public key: ${response.publicKey.toString()}`
          );
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      console.log("Phantom Wallet");

      const response = await solana.connect();
      console.log(
        `Connected with public key: ${response.publicKey.toString()}`
      );
      setWalletAddress(response.publicKey.toString());
    }
  };

  const disconnectWallet = async () => {
    const { solana } = window;

    if (solana) {
      await solana.disconnect();
      setWalletAddress(null);
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      const tx = await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        `Created a new BaseAccount w/ address:${baseAccount.publicKey.toString()}`
      );
      await getGifs();

      console.log(`📝 Your transaction signature ${tx}`);
    } catch (err) {
      console.log(`Error creating BaseAccount for account: ${err}`);
    }
  };

  const sendGif = async () => {
    if (/\.gif$/.test(inputValue) && isURL(inputValue)) {
      console.log(`Gif URL: ${inputValue}`);

      try {
        const provider = getProvider();
        const program = new Program(idl, programID, provider);
        const tx = await program.rpc.addGif(inputValue, {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          },
        });
        console.log(`📝 Your transaction signature ${tx}`);
        await getGifs();
        toast(`Gif added successfully`);
        setInputValue("");
      } catch (err) {
        toast(`😢 Error adding Gif`);
        console.error(err);
      }
    } else {
      toast("No or invalid gif URL provided");
    }
  };

  const removeGif = async (gif) => {
    if (gif) {
      try {
        const provider = getProvider();
        const program = new Program(idl, programID, provider);
        const tx = await program.rpc.removeGif(gif.gifLink, {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          },
        });
        await getGifs();
      } catch (err) {
        console.error(err);
      }
    } else {
      toast(`Invalid Gif`);
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () =>
    gifs === null ? (
      <div className="connected-container">
        <button
          className="cta-button connect-wallet-button"
          onClick={disconnectWallet}
        >
          Disconnect Wallet
        </button>
        <button
          type="submit"
          className="cta-button submit-gif-button"
          onClick={createGifAccount}
        >
          Initialize Gif Account
        </button>
      </div>
    ) : (
      <div className="connected-container">
        <button
          className="cta-button connect-wallet-button"
          onClick={disconnectWallet}
        >
          Disconnect Wallet
        </button>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter a GIF URL"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
          {gifs.map((gif, index) => (
            <div className="card-container" key={index}>
              <div className="gif-container">
                <img src={gif.gifLink} alt="gif" />
              </div>
              <div>
                <div className="card-text">
                  <span className="card-text-label">Submitted by </span>
                  <a
                    href={buildSolanaAccountLink(gif.userAddress)}
                    className="card-text-label"
                  >
                    {shortenAddress(gif.userAddress.toString())}
                  </a>
                </div>
                {console.log(gif)}
                <button
                  type="button"
                  className="cta-button submit-gif-button"
                  onClick={(event) => {
                    event.preventDefault();
                    removeGif(gif);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  const onInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const getGifs = useCallback(async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log(`Account: ${account}`);

      setGifs(account.gifList);
    } catch (err) {
      console.error(`Could not get Gif list due to: ${err}`);
      setGifs(null);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log(`Fetching GIF list...`);
      // Get Gifs from Solana API
      getGifs();
    }
  }, [walletAddress, getGifs]);

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <Toaster />
        <div className="header-container">
          <p className="header">🖼 Bluey GIF Portal</p>
          <p className="sub-text">
            View your Bluey GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={buildTwitterLink(TWITTER_HANDLE)}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
          <a
            className="footer-text"
            href={buildTwitterLink(MY_TWITTER_HANDLE)}
            target="_blank"
            rel="noreferrer"
          >{` by @${MY_TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
