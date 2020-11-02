'use strict';

const AWS = require('aws-sdk');

const underTest = async () => {
  const s3 = new AWS.S3({ region: 'ab-cdef-1' });
  return await s3.getObject({ Bucket: 'my', Key: 'thing' }).promise();
};

const eachPager = () =>
  new Promise((resolve, reject) => {
    const s3 = new AWS.S3({ region: 'ab-cdef-1' });
    let things = [];
    s3.listObjectsV2({ Bucket: 'my' }).eachPage((err, data, done) => {
      if (err) return reject(err);
      if (!data) return resolve(things);
      things = things.concat(data.Contents);
      done();
    });
  });

const nested = async () => {
  const ddb = new AWS.DynamoDB.DocumentClient({ region: 'us-west-3' });
  return await ddb.get({ Key: { key: 'value' } }).promise();
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

  it('can mock .promise()', async () => {
    const response = { Body: 'foo' };
    const get = AWS.spyOnPromise('S3', 'getObject', response);

    const result = await underTest();
    expect(result).toEqual(response);
    expect(get).toHaveBeenCalledWith({ Bucket: 'my', Key: 'thing' });
  });

  it('can mock .promise() with no return value', async () => {
    AWS.spyOnPromise('S3', 'getObject');
    const result = await underTest();
    expect(result).toStrictEqual({});
  });

  it('can mock .promise() with error', async () => {
    AWS.spyOnPromise('S3', 'getObject', new Error('foo'));
    await expect(() => underTest()).rejects.toThrow('foo');
  });

  it('cannot double-mock .promise()', async () => {
    AWS.spyOnPromise('S3', 'getObject');
    expect(() => AWS.spyOnPromise('S3', 'getObject')).toThrow(
      'S3.getObject is already mocked'
    );
  });

  it('can mock .eachPage() with one page', async () => {
    const list = AWS.spyOnEachPage('S3', 'listObjectsV2', [
      { Contents: [1, 2, 3] }
    ]);

    const result = await eachPager();
    expect(result).toStrictEqual([1, 2, 3]);
    expect(list).toHaveBeenCalledWith({ Bucket: 'my' });
  });

  it('can mock .eachPage() with multiple pages', async () => {
    AWS.spyOnEachPage('S3', 'listObjectsV2', [
      { Contents: [1, 2, 3] },
      { Contents: [4, 5, 6] }
    ]);

    const result = await eachPager();
    expect(result).toStrictEqual([1, 2, 3, 4, 5, 6]);
  });

  it('can mock .eachPage() errors', async () => {
    AWS.spyOnEachPage('S3', 'listObjectsV2', [
      { Contents: [1, 2, 3] },
      new Error('foo')
    ]);

    await expect(() => eachPager()).rejects.toThrow('foo');
  });

  it('demands you provide pages to mock .eachPage()', async () => {
    expect(() => AWS.spyOnEachPage('S3', 'listObjectsV2')).toThrow(
      'to mock .eachPage(), you must provide an array of pages'
    );
  });

  it('cannot double-mock .eachPage()', async () => {
    AWS.spyOnEachPage('S3', 'listObjectsV2', []);
    expect(() => AWS.spyOnEachPage('S3', 'listObjectsV2', [])).toThrow(
      'S3.listObjectsV2 is already mocked'
    );
  });

  it('can mock and clear nested clients like DynamoDB.DocumentClient', async () => {
    const get = AWS.spyOnPromise('DynamoDB.DocumentClient', 'get', {
      key: 'value',
      data: 'stuff'
    });
    const result = await nested();
    expect(result).toStrictEqual({ key: 'value', data: 'stuff' });
    expect(get).toHaveBeenCalledWith({ Key: { key: 'value' } });

    AWS.clearAllMocks();
    const ddb = new AWS.DynamoDB.DocumentClient();
    expect(jest.isMockFunction(ddb)).toEqual(false);
    expect(AWS['DynamoDB.DocumentClient']).toEqual(undefined);

    const get2 = AWS.spyOnPromise('DynamoDB.DocumentClient', 'get', {
      key: 'value',
      data: 'get2'
    });
    const result2 = await nested();
    expect(result2).toStrictEqual({ key: 'value', data: 'get2' });
    expect(get2).toHaveBeenCalledWith({ Key: { key: 'value' } });
  });
});
