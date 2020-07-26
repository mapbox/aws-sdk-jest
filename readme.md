# @mapbox/aws-sdk-jest

A generic Jest mock for the aws-sdk module.

## How to set it up

1. Install this module as a devDependency `npm install -D @mapbox/aws-sdk-jest`.
2. Add a file in your repository at `test/__mocks__/aws-sdk.js`
3. The file should look like this:

```js
'use strict';

module.exports = require('@mapbox/aws-sdk-jest');
```

## The stubbing methods it provides

**AWS.spyOn(service, method)**

Returns a Jest mock function for an AWS SDK method call like `s3.getObject()`. You provide your own `.mockImplementation()` or `.mockReturnValue()` by setting it on the mock function in your test.

**AWS.spyOnPromise(service, method, response)**

Again, returns a Jest mock function for an AWS SDK method call like `s3.getObject()`. However, it anticipates that your code under test will use the `.promise()` method. **The `response` argument is optional**.

- If you do not provide a `response`, the `.promise()` will resolve with an empty object.
- If you provide an Error object as `response`, the `.promise()` will reject with the error.
- If you provide any other thing as `response`, the `.promise()` will resolve with that thing.

**AWS.spyOnEachPage(service, method, pages)**

Also returns a Jest mock function for an AWS SDK method call that supports pagination, like `s3.listObjectsV2()`. This time, it anticipates that your code under test will use the `.eachPage()` method.

**The `pages` argument is required**, and must be an array representing the pages that the code will observe during the test. If any of the pages are an Error object, then that error will be returned to the `.eachPage()` caller after sending non-error pages.

## Examples

Here is an example function that maybe you would like to test.

```js
const getThing = async () => {
  const s3 = new AWS.S3({ region: 'us-east-1' });
  return await s3.getObject({ Bucket: 'my', Key: 'thing' }).promise();
};
```

Here is a set of tests for it.

```js
'use strict';

const AWS = require('aws-sdk');

describe('getting things', () => {
  afterEach(() => AWS.clearAllMocks());

  it('returns the thing', async () => {
    const get = AWS.spyOn('S3', 'getObject').mockReturnValue({
      promise: () => Promise.resolve('foo')
    });

    const thing = await getThing();
    expect(thing).toEqual('foo');
  });

  it('sets up an s3 client in the right region', async () => {
    AWS.spyOn('S3', 'getObject').mockReturnValue({
      promise: () => Promise.resolve('foo')
    });

    await getThing();
    expect(AWS.S3).toHaveBeenCalledWith({ region: 'ab-cdef-1' });
  });

  it('asks for the right thing', async () => {
    const get = AWS.spyOn('S3', 'getObject').mockReturnValue({
      promise: () => Promise.resolve('foo')
    });

    await getThing();
    expect(get).toHaveBeenCalledWith({ Bucket: 'my', Key: 'thing' });
  });

  it('can mock .promise() directly', async () => {
    const get = AWS.spyOnPromise('S3', 'getObject', { Body: 'foo' });
    const result = await getThing();
    expect(result).toStrictEqual({ Body: 'foo' });
    expect(get).toHaveBeenCalledWith({ Bucket: 'my', Key: 'thing' });
  });

  it('can handle mocked .promise() errors', async () => {
    const get = AWS.spyOnPromise('S3', 'getObject', new Error('foo'));
    await expect(() => getThing()).rejects.toThrow('foo');
  });
});
```

If your code uses `.eachPage()`, there's a way to mock that, too. Say you're testing this function:

```js
const underTest = () =>
  new Promise((resolve, reject) => {
    const s3 = new AWS.S3({ region: 'us-east-1' });
    let things = [];
    s3.listObjectsV2({ Bucket: 'myBucket' }).eachPage((err, data, done) => {
      console.log(err, data);
      if (err) return reject(err);
      if (!data) return resolve(things);
      things = things.concat(data.Contents);
      done();
    });
  });
```

You can mock the method call by providing a list of pages that should be returned.

```js
'use strict';

const AWS = require('aws-sdk');

describe('listing things', () => {
  it('can mock .eachPage directly', async () => {
    const list = AWS.spyOnEachPage('S3', 'listObjectsV2', [
      { Contents: [1, 2, 3] },
      { Contents: [4, 5, 6] }
    ]);

    const result = await underTest();
    expect(result).toStrictEqual([1, 2, 3, 4, 5, 6]);
    expect(list).toHaveBeenCalledWith({ Bucket: 'myBucket' });
  });

  it('can mock .eachPage errors on any page', async () => {
    AWS.spyOnEachPage('S3', 'listObjectsV2', [
      { Contents: [1, 2, 3] },
      new Error('foo')
    ]);

    await expect(() => underTest()).rejects.toThrow('foo');
  });
});
```

## Some notes

- If you try to mock a method twice, you will get an error.
- You should be familiar with the [AWS.Request][1] object, because if your code needs to set special expectations for `.promise()`, `.eachPage()`, or `.on()`, then you're going to have to use `AWS.spyOn()` and provide your own implementations for those Request methods.

[1]: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Request.html
