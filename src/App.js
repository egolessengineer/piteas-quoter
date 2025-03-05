import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "bootstrap/dist/css/bootstrap.min.css";

// const PITEAS_ROUTER_ADDRESS = "0x6BF228eb7F8ad948d37deD07E595EfddfaAF88A6";
// const PULSECHAIN_RPC = "https://rpc.pulsechain.com";
const QUOTE_API_URL = "https://sdk.piteas.io/quote";
// const TOKEN_LIST_URL = "https://raw.githubusercontent.com/piteasio/app-tokens/main/piteas-tokenlist.json";
const TOKEN_LIST_URL =
  "https://res.cloudinary.com/dq9alywlv/raw/upload/v1741168262/custom-piteas-tokenlist_jlomtr.json";
// const CHAIN_ID = 369;

const App = () => {
  const [inputToken, setInputToken] = useState("PLS");
  const [outputToken, setOutputToken] = useState("PLS");
  const [inputAmount, setInputAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState(null);
  const [tokenList, setTokenList] = useState([]);
  const [message, setMessage] = useState("");
  const [balanceFetchStatus, setBalanceFetchStatus] = useState("");

  // Fetch token list from remote source
  const fetchTokenList = async () => {
    try {
      const response = await fetch(TOKEN_LIST_URL);
      const data = await response.json();
      const updatedList = [
        {
          address: "PLS",
          symbol: "PLS",
          decimals: 18,
          logoURI:
            "https://assets.coingecko.com/coins/images/279/large/pulse.png",
        },
        ...data.tokens,
      ];
      setTokenList(updatedList);
      setMessage("Token list loaded successfully.");
    } catch (error) {
      console.error("Error fetching token list:", error);
      setMessage("Failed to load token list.");
    }
  };

  // Fetch swap quote
  let lastQuoteTimestamp = 0; // Timestamp of the last request
  const [isFetching, setIsFetching] = useState(false); // Tracks if a request is in progress

  const fetchQuote = async () => {
    const now = Date.now();
    const timeSinceLastQuote = now - lastQuoteTimestamp;

    if (timeSinceLastQuote < 12000) {
      // Check if 12 seconds have passed
      setMessage(
        "Please wait at least 12 seconds before fetching a new quote."
      );
      return;
    }

    if (isFetching) {
      setMessage("Quote request is already in progress. Please wait.");
      return;
    }

    setIsFetching(true); // Update state when request starts
    try {
      if (!inputToken || !outputToken || !inputAmount) {
        setMessage("Please fill all fields.");
        setIsFetching(false);
        return;
      }

      const inputTokenDetails = tokenList.find(
        (token) => token.address === inputToken
      ) || { decimals: 18 };
      const outputTokenDetails = tokenList.find(
        (token) => token.address === outputToken
      ) || { decimals: 18 };

      const inputAmountInDecimals = ethers.utils.parseUnits(
        inputAmount,
        inputTokenDetails.decimals
      );

      // Construct the query parameters
      const query = new URLSearchParams({
        tokenInAddress: inputToken === "PLS" ? "PLS" : inputToken,
        tokenOutAddress: outputToken === "PLS" ? "PLS" : outputToken,
        amount: inputAmountInDecimals.toString(),
        allowedSlippage: slippage,
      });

      const response = await fetch(`${QUOTE_API_URL}?${query.toString()}`);
      const data = await response.json();

      setQuote({
        inputToken: `${inputTokenDetails.symbol} (${inputToken})`,
        outputToken: `${outputTokenDetails.symbol} (${outputToken})`,
        inputAmount: parseFloat(inputAmount).toLocaleString(undefined, {
          minimumFractionDigits: 6,
        }),
        estimatedOutput: parseFloat(
          ethers.utils.formatUnits(data.destAmount, outputTokenDetails.decimals)
        ).toLocaleString(undefined, {
          minimumFractionDigits: outputTokenDetails.decimals,
        }),
        gasFee: data.gasUseEstimate,
        calldata: data.methodParameters.calldata,
      });
      setMessage("Quote fetched successfully.");
      lastQuoteTimestamp = now; // Update the timestamp of the last request
    } catch (error) {
      console.error("Error fetching quote:", error);
      setMessage("Failed to fetch quote.");
    } finally {
      setIsFetching(false); // Reset state when request is complete
    }
  };

  useEffect(() => {
    fetchTokenList();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessage("");
      setBalanceFetchStatus("");
    }, 10000);
    return () => clearTimeout(timer);
  }, [message, balanceFetchStatus]);

  return (
    <div className="container py-4">
      <h1 className="text-center mb-4 fs-4">Swap Quotes by Piteas API</h1>

      <div className="mb-3">
        <label>Input Token:</label>
        <select
          className="form-select"
          onChange={(e) => setInputToken(e.target.value)}
          value={inputToken}
        >
          {tokenList.map((token) => (
            <option key={token.address} value={token.address}>
              {token.symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label>Output Token:</label>
        <select
          className="form-select"
          onChange={(e) => setOutputToken(e.target.value)}
          value={outputToken}
        >
          {tokenList.map((token) => (
            <option key={token.address} value={token.address}>
              {token.symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label>Input Amount:</label>
        <input
          className="form-control"
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label>Slippage:</label>
        <input
          className="form-control"
          type="number"
          step="0.1"
          min="0"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary mb-3"
        onClick={fetchQuote}
        disabled={isFetching || !inputAmount || !inputToken || !outputToken}
      >
        {isFetching ? "Fetching..." : "Get Quote"}
      </button>

      {quote && (
        <div className="mt-3">
          <div className="p-3 border border-secondary rounded">
            <p style={{ fontSize: "0.9rem", margin: "4px 0" }}>
              <strong>Input Token:</strong> {quote.inputToken}
            </p>
            <p style={{ fontSize: "0.9rem", margin: "4px 0" }}>
              <strong>Output Token:</strong> {quote.outputToken}
            </p>
            <p style={{ fontSize: "0.9rem", margin: "4px 0" }}>
              <strong>Input Amount:</strong> {quote.inputAmount}
            </p>
            <p style={{ fontSize: "0.9rem", margin: "4px 0" }}>
              <strong>Estimated Output:</strong> {quote.estimatedOutput}
            </p>
            <p style={{ fontSize: "0.9rem", margin: "4px 0" }}>
              <strong>Gas Fee:</strong> {quote.gasFee}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className="alert alert-info alert-dismissible fade show mt-3"
          role="alert"
        >
          {message}
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="alert"
            aria-label="Close"
          ></button>
        </div>
      )}

      {balanceFetchStatus && (
        <div className="alert alert-secondary mt-3">{balanceFetchStatus}</div>
      )}
    </div>
  );
};

export default App;
