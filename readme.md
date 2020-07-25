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

## How to use it in a test

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
});
```

## Some usage notes

- If you try to mock a method twice, you will get an error.
- If your code makes a method call that has not been mocked, it will attempt to make the real API request.
- If you don't provide a `.mockImplementation` or `.mockReturnValue`, it will attempt to make the real API request, but you can spy on the method to see how the code used it.
- You should be familiar with the [AWS.Request][1] object, because if your code uses `.promise()`, `.eachPage()`, or `.on()`, then you're going to need to provide implementations for those Request methods.

[1]: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Request.html
