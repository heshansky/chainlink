import reducer, { INITIAL_STATE } from '../../src/reducers'

describe('reducers/redirect', () => {
  const redirectAction = {
    type: 'REDIRECT',
    to: '/foo',
  }

  it('REDIRECT sets "to" as the given url', () => {
    const state = reducer(INITIAL_STATE, redirectAction)
    expect(state.redirect.to).toEqual('/foo')
  })

  it('MATCH_ROUTE clears "to"', () => {
    let state = reducer(INITIAL_STATE, redirectAction)
    expect(state.redirect.to).not.toBeUndefined()

    state = reducer(state, { type: 'MATCH_ROUTE' })
    expect(state.redirect.to).toBeUndefined()
  })
})
