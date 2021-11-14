import { useEffect, useState, useCallback } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import "./App.css";
import idl from "./idl.json";

// Constants
const MY_TWITTER_HANDLE = "serj_mig";
const TWITTER_HANDLE = "_buildspace";
const TEST_GIFS = [
  "https://media.giphy.com/media/hpw1SJwOIMdrOCGlqU/giphy.gif",
  "https://media.giphy.com/media/WOBm5UtSIcoYUoImom/giphy.gif",
  "https://media.giphy.com/media/dxIZUFBsWRWKG8vnoB/giphy.gif",
  "https://media.giphy.com/media/kcknoz0ZnVCjSvktZe/giphy.gif",
  "https://media.giphy.com/media/j5hRw3cDetz3jrXHLp/giphy.gif",
  "https://media.giphy.com/media/l1NYpaKni2cTmT0oH7/giphy.gif",
  "https://media.giphy.com/media/fSpUg2o4sgF4AIlr6z/giphy.gif",
  "https://media.giphy.com/media/Qtuw7rqoeSxwlzUHp2/giphy.gif",
  "https://media.giphy.com/media/cNrHE8vu2T5lQ1Wz3t/giphy.gif",
];

const { SystemProgram, Keypair } = web3;

let baseAccount = Keypair.generate();

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl("devnet");

const opts = {
  preflightCommitment: "processed",
};

const App = () => {
  const buildLink = (handle) => `https://twitter.com/${handle}`;

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
    if (inputValue.length > 0) {
      console.log(`Gif URL: ${inputValue}`);
      TEST_GIFS.push(inputValue);
      setInputValue("");
    } else {
      console.log("No gif URL provided");
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
          type="submit"
          className="cta-button submit-gif-button"
          onClick={createGifAccount}
        >
          Initialize Gif Account
        </button>
      </div>
    ) : (
      <div className="connected-container">
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
            <div className="gif-container" key={index}>
              <img src={gif.gifLink} alt="gif" />
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
            href={buildLink(TWITTER_HANDLE)}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
          <a
            className="footer-text"
            href={buildLink(MY_TWITTER_HANDLE)}
            target="_blank"
            rel="noreferrer"
          >{` by @${MY_TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
