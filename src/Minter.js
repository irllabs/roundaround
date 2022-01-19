import { useEffect, useState } from "react"
import { connectWallet, getCurrentWalletConnected, mintNFT } from "./utils/interact"
import { Box, Typography } from "@material-ui/core";

const Minter = ({ round, classes, captureScreen }) => {

    //State variables
    const [walletAddress, setWallet] = useState("")
    const [status, setStatus] = useState("")
    const [description, setDescription] = useState("")
    const [url] = useState("https://via.placeholder.com/150") //TODO: upload rounds screenshot and return url

    function addWalletListener() {
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    setWallet(accounts[0])
                    setStatus("👆🏽 Write a message in the text-field above.");
                } else {
                    setWallet("")
                    setStatus("🦊 Connect to Metamask using the top right button.")
                }
            })
        } else {
            setStatus(
                <p>
                    {" "}
                    🦊{" "}
                    <a target="_blank" rel="noreferrer" href={`https://metamask.io/download.html`}>
                        You must install Metamask, a virtual Ethereum wallet, in your
                        browser.
                    </a>
                </p>
            )
        }
    }

    useEffect(() => {
        (async () => {
            const { address, status } = await getCurrentWalletConnected();
            setWallet(address)
            setStatus(status)
            addWalletListener()
        })()
    }, [])

    const connectWalletPressed = async () => {
        const walletResponse = await connectWallet()
        setStatus(walletResponse.status)
        setWallet(walletResponse.address)
    }

    const onMintPressed = async () => {
        //captureScreen().then(async res => {
        //console.log('screen ', res)
        const { status } = await mintNFT(url, round.name, description, round);
        setStatus(status)
        //})
    }

    return (
        <Box className={classes.nftMinter}>
            <button className={classes.nftButton} id="walletButton" onClick={connectWalletPressed}>
                {walletAddress.length > 0 ? (
                    "Connected: " +
                    String(walletAddress).substring(0, 6) +
                    "..." +
                    String(walletAddress).substring(38)
                ) : (
                    <Typography>Connect Wallet</Typography>
                )}
            </button>
            <Typography className={classes.nftTitle} id="title">Mint NFT</Typography>
            <Box className={classes.inputsContainer}>
                <Typography className={classes.nftLabel}>Name: {round && round.name}</Typography>
                <input
                    type="text"
                    placeholder="Description e.g. Even cooler than cryptokitties ;)"
                    className={classes.nftInput}
                    onChange={(event) => setDescription(event.target.value)}
                />
            </Box>
            <button className={classes.nftButton} style={{ marginTop: 5 }} id="mintButton" onClick={onMintPressed}>
                Start Minting
            </button>
            <Box id='status' className={classes.status}>
                <Typography style={{ textAlign: 'center' }}>{status}</Typography>
            </Box>
        </Box>
    )
};

export default Minter
