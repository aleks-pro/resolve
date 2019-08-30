import sinon from 'sinon'

test('resolve-storage-mysql index', () => {
  const createAdapter = require('resolve-storage-base')
  const connect = require('../src/connect')
  const init = require('../src/init')
  const loadEvents = require('../src/load-events')
  const getLatestEvent = require('../src/get-latest-event')
  const saveEvent = require('../src/save-event')
  const drop = require('../src/drop')
  const dispose = require('../src/dispose')
  const importStream = require('../src/import')
  const exportStream = require('../src/export')
  const freeze = require('../src/freeze')
  const unfreeze = require('../src/unfreeze')

  sinon.stub(init, 'default').callsFake(() => () => {})
  sinon.stub(connect, 'default').callsFake(() => () => {})
  sinon.stub(loadEvents, 'default').callsFake(() => () => {})
  sinon.stub(getLatestEvent, 'default').callsFake(() => () => {})
  sinon.stub(saveEvent, 'default').callsFake(() => () => {})
  sinon.stub(drop, 'default').callsFake(() => () => {})
  sinon.stub(dispose, 'default').callsFake(() => () => {})
  sinon.stub(importStream, 'default').callsFake(() => () => {})
  sinon.stub(exportStream, 'default').callsFake(() => () => {})
  sinon.stub(freeze, 'default').callsFake(() => () => {})
  sinon.stub(unfreeze, 'default').callsFake(() => () => {})

  sinon.stub(createAdapter, 'default').callsFake(args => {
    for (const func of Object.values(args)) {
      if (typeof func === 'function') {
        func()
      }
    }
  })

  const index = require('../src/index.js')

  expect(connect.default.callCount).toEqual(0)
  expect(init.default.callCount).toEqual(0)
  expect(loadEvents.default.callCount).toEqual(0)
  expect(getLatestEvent.default.callCount).toEqual(0)
  expect(saveEvent.default.callCount).toEqual(0)
  expect(drop.default.callCount).toEqual(0)
  expect(dispose.default.callCount).toEqual(0)
  expect(importStream.default.callCount).toEqual(0)
  expect(exportStream.default.callCount).toEqual(0)
  expect(freeze.default.callCount).toEqual(0)
  expect(unfreeze.default.callCount).toEqual(0)

  index.default()

  expect(connect.default.callCount).toEqual(1)
  expect(init.default.callCount).toEqual(1)
  expect(loadEvents.default.callCount).toEqual(1)
  expect(getLatestEvent.default.callCount).toEqual(1)
  expect(saveEvent.default.callCount).toEqual(1)
  expect(drop.default.callCount).toEqual(1)
  expect(dispose.default.callCount).toEqual(1)
  expect(importStream.default.callCount).toEqual(1)
  expect(exportStream.default.callCount).toEqual(1)
  expect(freeze.default.callCount).toEqual(1)
  expect(unfreeze.default.callCount).toEqual(1)
})
