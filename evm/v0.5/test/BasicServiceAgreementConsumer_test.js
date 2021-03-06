import * as h from './support/helpers'
import { assertBigNum } from './support/matchers'
const Coordinator = artifacts.require('Coordinator.sol')
const MeanAggregator = artifacts.require('MeanAggregator.sol')
const ServiceAgreementConsumer = artifacts.require(
  'ServiceAgreementConsumer.sol',
)

contract('ServiceAgreementConsumer', () => {
  const currency = h.toHex('USD')
  let link, coord, cc, agreement

  beforeEach(async () => {
    const meanAggregator = await MeanAggregator.new()
    agreement = await h.newServiceAgreement({
      oracles: [h.oracleNode],
      aggregator: meanAggregator.address,
      aggInitiateJobSelector: h.functionSelectorFromAbi(
        meanAggregator,
        'initiateJob',
      ),
      aggFulfillSelector: h.functionSelectorFromAbi(meanAggregator, 'fulfill'),
    })
    link = await h.linkContract()
    coord = await Coordinator.new(link.address)
    await h.initiateServiceAgreement(coord, agreement)
    cc = await ServiceAgreementConsumer.new(
      link.address,
      coord.address,
      agreement.id,
    )
  })

  it('gas price of contract deployment is predictable', async () => {
    const rec = await h.eth.getTransactionReceipt(cc.transactionHash)
    assert.isBelow(rec.gasUsed, 1500000)
  })

  describe('#requestEthereumPrice', () => {
    context('without LINK', () => {
      it('reverts', async () => {
        await h.assertActionThrows(async () => {
          await cc.requestEthereumPrice(currency)
        })
      })
    })

    context('with LINK', () => {
      const paymentAmount = h.toWei('1', 'h.ether')
      beforeEach(async () => {
        await link.transfer(cc.address, paymentAmount)
      })

      it('triggers a log event in the Coordinator contract', async () => {
        const tx = await cc.requestEthereumPrice(currency)
        const log = tx.receipt.rawLogs[3]
        assert.equal(log.address.toLowerCase(), coord.address.toLowerCase())

        const request = h.decodeRunRequest(log)
        const params = await h.decodeDietCBOR(request.data)
        assert.equal(agreement.id, request.jobId)
        assertBigNum(paymentAmount, h.bigNum(request.payment))
        assert.equal(cc.address.toLowerCase(), request.requester.toLowerCase())
        assertBigNum(1, request.dataVersion)
        const url =
          'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,JPY'
        assert.deepEqual(params, { path: currency, get: url })
      })

      it('has a reasonable gas cost', async () => {
        const tx = await cc.requestEthereumPrice(currency)
        assert.isBelow(tx.receipt.gasUsed, 175000)
      })
    })
  })

  describe('#fulfillOracleRequest', () => {
    const response = h.toHex('1,000,000.00')
    let request

    beforeEach(async () => {
      await link.transfer(cc.address, h.toWei(1, 'ether'))
      const tx = await cc.requestEthereumPrice(currency)
      request = h.decodeRunRequest(tx.receipt.rawLogs[3])
    })

    it('records the data given to it by the oracle', async () => {
      await coord.fulfillOracleRequest(request.id, response, {
        from: h.oracleNode,
      })
      const currentPrice = await cc.currentPrice.call()
      assert.equal(h.toUtf8(currentPrice), h.toUtf8(response))
    })

    context('when the consumer does not recognize the request ID', () => {
      let request2

      beforeEach(async () => {
        const funcSig = h.functionSelector('fulfill(bytes32,bytes32)')
        const args = h.executeServiceAgreementBytes(
          agreement.id,
          cc.address,
          funcSig,
          1,
          '',
        )
        const tx = await h.requestDataFrom(coord, link, agreement.payment, args)
        request2 = h.decodeRunRequest(tx.receipt.rawLogs[2])
      })

      it('does not accept the data provided', async () => {
        await coord.fulfillOracleRequest(request2.id, response, {
          from: h.oracleNode,
        })

        const received = await cc.currentPrice.call()
        assert.equal(h.toUtf8(received), '')
      })
    })

    context('when called by anyone other than the oracle contract', () => {
      it('does not accept the data provided', async () => {
        await h.assertActionThrows(async () => {
          await cc.fulfill(request.id, response, { from: h.oracleNode })
        })
        const received = await cc.currentPrice.call()
        assert.equal(h.toUtf8(received), '')
      })
    })
  })
})
