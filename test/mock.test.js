'use strict';

const AWS = require('aws-sdk');

const underTest = async () => {
  const s3 = new AWS.S3({ region: 'ab-cdef-1' });
  return await s3.getObject({ Bucket: 'my', Key: 'thing' }).promise();
};

describe('stubbing', () => {
  afterEach(() => AWS.clearAllMocks());

  it('stubs constructors and methods', async () => {
    const get = AWS.spyOn('S3', 'getObject').mockReturnValue({
      promise: () => Promise.resolve('foo')
    });

    await expect(underTest()).resolves.toEqual('foo');
    expect(AWS.S3).toHaveBeenCalledWith({ region: 'ab-cdef-1' });
    expect(get).toHaveBeenCalledWith({ Bucket: 'my', Key: 'thing' });
  });

  it('clears mocks', async () => {
    AWS.spyOn('S3', 'putObject');

    const s3 = new AWS.S3();
    expect(jest.isMockFunction(s3.putObject)).toEqual(true);

    AWS.clearAllMocks();
    const after = new AWS.S3();
    expect(jest.isMockFunction(after.putObject)).toEqual(false);
    expect(jest.isMockFunction(after.getObject)).toEqual(false);
  });

  it('does not let you stub a method twice', () => {
    AWS.spyOn('S3', 'putObject');

    expect(() => AWS.spyOn('S3', 'putObject')).toThrow(
      'S3.putObject is already mocked'
    );
  });

  it('lets you make AWS clients that are not stubbed', () => {
    const s3 = new AWS.S3();
    expect(jest.isMockFunction(s3.getObject)).toEqual(false);
  });

  it('does not let you stub non-existent methods', () => {
    expect(() => AWS.spyOn('S3', 'FlyingSpaghettiMonster')).toThrow();
  });
});
