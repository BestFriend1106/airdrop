import styles from 'styles/Home.module.scss'
import { BigNumber, Contract, ethers } from 'ethers'
import { ThemeToggleButton, ThemeToggleList } from 'components/Theme'
import { Children, useState } from 'react'
import ConnectWallet from 'components/Connect/ConnectWallet'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount, useProvider, useSigner } from 'wagmi'
import { parseFixed } from '@ethersproject/bignumber'
const getBYD = '0x0832018cA45349bbc0e8Ef5bf5d9F06FbB62fC8a' //pulse
// const getBYD = '0x2719cCF1bde2Cea26e3442D2e4fae24626148098' //localhost
export default function Home() {
  return (
    <div className={styles.container}>
      <Header />
      <Main />
    </div>
  )
}

function Header() {
  return (
    <header className={styles.header}>
      <div>
        <ThemeToggleList />
      </div>
      <div className="flex items-center">
        <ThemeToggleButton /> Pulse Airdrop <ThemeToggleList />
      </div>

      <div className="flex items-center">
        <ThemeToggleButton />
        <ThemeToggleList />
      </div>
    </header>
  )
}

function Main() {
  const [sendAddress, setSendAddress] = useState([])
  const [amount, setAmount] = useState([])

  const { openConnectModal } = useConnectModal()
  const { data: signer, isError, isLoading } = useSigner()
  const [array, setArray] = useState([])
  const [token, setToken] = useState('')
  const [decimal, setDecimal] = useState<number>(0)
  const [total, setTotal] = useState<BigNumber>(BigNumber.from(0))
  const { address } = useAccount()

  const fileReader = new FileReader()
  fileReader.onload = function (event) {
    const text = event.target.result
    csvFileToArray(text)
  }

  const handleOnChange = e => {
    fileReader.readAsText(e.target.files[0])
  }
  const csvFileToArray = string => {
    const csvRows = string.split('\n')
    const _array = csvRows.map(i => {
      const values = i.replace('\r', '').split(',')
      return { address: values[0], amount: values[1] }
    })
    let _sendAddress = [],
      _amount = []
    let _total = BigNumber.from(0)
    for (let i = 0; i < _array.length; i++) {
      const sendAddressTemp = _array[i].address
      const sendAmountTemp = _array[i].amount
      const am = parseFixed(sendAmountTemp, decimal)
      _sendAddress.push(sendAddressTemp)
      _amount.push(am)
      _total = _total.add(am)
    }
    setSendAddress(_sendAddress)
    setAmount(_amount)
    setTotal(_total)
    setArray(_array)
    console.log('total', _total.toString())
  }
  async function approve() {
    const abi = ['function approve(address, uint256)']
    const tokenContract = new Contract(token, abi, signer)
    const tx = await tokenContract.approve(getBYD, total)
    await tx.wait()
  }
  async function transfer() {
    const getBYDdaiAbi = ['function sale(address, address[], uint256[])']
    const getBYDdaiContract = new Contract(getBYD, getBYDdaiAbi, signer)
    const nCount = 10
    let gas = 0
    if (sendAddress.length >= 200) {
      {
        const sendAddress400 = sendAddress.slice(0, sendAddress.length / nCount)
        const sendAmount400 = amount.slice(0, sendAddress.length / nCount)
        const calldata = getBYDdaiContract.interface.encodeFunctionData('sale', [token, sendAddress400, sendAmount400])
        console.log('sendAddress------>', sendAddress400)
        console.log('amount------------>', sendAmount400)
        const res = await signer.estimateGas({
          to: getBYD,
          from: address,
          data: calldata,
        })
        gas = res.toNumber() * 3
      }
      console.log('gas', gas)
      for (let i = 1; i <= nCount; i++) {
        const sendAddress400 = sendAddress.slice(
          ((i - 1) / nCount) * sendAddress.length,
          (i / nCount) * sendAddress.length
        )
        const sendAmount400 = amount.slice(((i - 1) / nCount) * sendAddress.length, (i / nCount) * sendAddress.length)
        const calldata = getBYDdaiContract.interface.encodeFunctionData('sale', [token, sendAddress400, sendAmount400])
        console.log('sendAddress------>', sendAddress400)
        console.log('amount------------>', sendAmount400)
        signer
          .sendTransaction({
            from: address,
            to: getBYD,
            data: calldata,
            gasPrice: '20000000000',
            gasLimit: gas.toString(),
          })
          .then(res => {
            console.log(res)
          })
      }
    } else {
      const calldata = getBYDdaiContract.interface.encodeFunctionData('sale', [token, sendAddress, amount])
      signer
        .estimateGas({
          to: getBYD,
          from: address,
          data: calldata,
        })
        .then(res => {
          console.log('gasLimit', res.toNumber())
          return res.toNumber()
        })
        .then(est => {
          return signer.sendTransaction({
            from: address,
            to: getBYD,
            data: calldata,
            gasPrice: '20000000000',
            gasLimit: est.toString(),
          })
        })
        .then(res => {
          console.log(res)
        })
    }
  }

  return (
    <div className="container mx-auto mt-10">
      <div className="flex w-full flex-col items-center">
        <ConnectWallet />
      </div>
      {/* <div className="mt-4 flex flex-col items-center">
        {openConnectModal && (
          <button
            onClick={openConnectModal}
            type="button"
            className="hover:scale-nCount5 m-1 rounded-lg bg-orange-500 py-1 px-3 text-white transition-all duration-150"
          >
            useConnectModal
          </button>
        )}
      </div> */}
      <div className="mt-4 flex justify-center gap-2">
        <div className="flex flex-col">
          <span>Token Address</span>
          <input
            className="border-slate-30 block w-96 rounded-md border p-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:text-sm"
            value={token}
            onChange={e => {
              setToken(e.target.value)
            }}
          />
        </div>
        <div className="flex flex-col">
          <span>Decimal</span>
          <input
            className="block w-16 rounded-md border border-slate-300 p-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:text-sm"
            value={decimal}
            onChange={e => {
              setDecimal(Number(e.target.value))
            }}
          />
        </div>
      </div>
      <div className="mx-auto mt-4 justify-center rounded-xl text-center">
        <input type={'file'} id={'csvFileInput'} accept={'.csv'} onChange={handleOnChange} />
        <button
          type="button"
          onClick={approve}
          className="m-1 rounded-lg bg-orange-500 py-1 px-3 text-white transition-all duration-150 hover:scale-105"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={transfer}
          className="m-1 rounded-lg bg-orange-500 py-1 px-3 text-white transition-all duration-150 hover:scale-105"
        >
          Transfer
        </button>
      </div>
      <div className="mx-auto mt-4 justify-center rounded-xl text-center">
        <table className="mx-auto">
          <thead>
            {array.length != 0 && (
              <tr key={'header'}>
                <th>Address</th>
                <th>Amount</th>
              </tr>
            )}
          </thead>

          <tbody>
            {array.map((item, index) => (
              <tr key={index}>
                <td>{item.address}</td>
                <td>{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
