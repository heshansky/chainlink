import reducer, { INITIAL_STATE } from '../../src/reducers'

describe('reducers/jobs', () => {
  it('UPSERT_JOBS upserts items along with the current page & count from meta', () => {
    const action = {
      type: 'UPSERT_JOBS',
      data: {
        specs: {
          a: { id: 'a' },
          b: { id: 'b' },
        },
        meta: {
          currentPageJobs: {
            data: [{ id: 'b' }, { id: 'a' }],
            meta: {
              count: 10,
            },
          },
        },
      },
    }
    const state = reducer(INITIAL_STATE, action)

    expect(state.jobs.items).toEqual({
      a: { id: 'a' },
      b: { id: 'b' },
    })
    expect(state.jobs.count).toEqual(10)
    expect(state.jobs.currentPage).toEqual(['b', 'a'])
  })

  it('UPSERT_RECENTLY_CREATED_JOBS upserts items along with the current page & count from meta', () => {
    const action = {
      type: 'UPSERT_RECENTLY_CREATED_JOBS',
      data: {
        specs: {
          c: { id: 'c' },
          d: { id: 'd' },
        },
        meta: {
          recentlyCreatedJobs: {
            data: [{ id: 'd' }, { id: 'c' }],
          },
        },
      },
    }
    const state = reducer(INITIAL_STATE, action)

    expect(state.jobs.items).toEqual({
      c: { id: 'c' },
      d: { id: 'd' },
    })
    expect(state.jobs.recentlyCreated).toEqual(['d', 'c'])
  })

  it('UPSERT_JOB upserts items', () => {
    const action = {
      type: 'UPSERT_JOB',
      data: {
        specs: {
          a: { id: 'a' },
        },
      },
    }
    const state = reducer(INITIAL_STATE, action)

    expect(state.jobs.items).toEqual({ a: { id: 'a' } })
  })

  it('RECEIVE_DELETE_SUCCESS deletes items', () => {
    const deleteAction = {
      type: 'RECEIVE_DELETE_SUCCESS',
      id: 'b',
    }
    const upsertAction = {
      type: 'UPSERT_JOB',
      data: { specs: { b: { id: 'b' } } },
    }

    const preDeleteState = reducer(INITIAL_STATE, upsertAction)
    expect(preDeleteState.jobs.items).toEqual({ b: { id: 'b' } })

    const postDeleteState = reducer(preDeleteState, deleteAction)
    expect(postDeleteState.jobs.items).toEqual({})
  })
})
