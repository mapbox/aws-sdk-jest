'use strict';

const AWS = jest.genMockFromModule('aws-sdk');
const _AWS = jest.requireActual('aws-sdk');
const traverse = require('traverse');

Object.keys(_AWS).forEach((service) => {
  AWS[service] = _AWS[service];
});

const clients = {};

clients.get = (service) => {
  const split = service.split('.');
  const real = traverse(_AWS).get(split);
  const mocked = traverse(AWS).get(split);

  if (!clients[service]) clients[service] = new real({});
  const client = clients[service];

  if (!jest.isMockFunction(mocked))
    traverse(AWS).set(
      split,
      jest.fn().mockImplementation(() => client)
    );

  return client;
};

AWS.spyOn = (service, method) => {
  const client = clients.get(service);
  if (jest.isMockFunction(client[method]))
    throw new Error(`${service}.${method} is already mocked`);
  return jest.spyOn(client, method);
};

AWS.spyOnPromise = (service, method, response = {}) => {
  const client = clients.get(service);
  if (jest.isMockFunction(client[method]))
    throw new Error(`${service}.${method} is already mocked`);

  return jest.spyOn(client, method).mockImplementation((params) => {
    const req = new _AWS.Request(client.service || client, method, params);
    req.promise = () =>
      new Promise((resolve, reject) =>
        process.nextTick(() => {
          if (response instanceof Error) return reject(response);
          resolve(response);
        })
      );
    return req;
  });
};

AWS.spyOnEachPage = (service, method, pages) => {
  if (!Array.isArray(pages))
    throw new Error('to mock .eachPage(), you must provide an array of pages');

  const client = clients.get(service);
  if (jest.isMockFunction(client[method]))
    throw new Error(`${service}.${method} is already mocked`);

  let i = 0;
  const sendPage = (callback) => {
    process.nextTick(() => {
      const page = pages[i];
      if (!page) return callback();
      i++;
      if (page instanceof Error) return callback(page);
      callback(null, page, () => sendPage(callback));
    });
  };

  return jest.spyOn(client, method).mockImplementation((params) => {
    const req = new _AWS.Request(client.service || client, method, params);
    req.eachPage = jest.fn().mockImplementation(sendPage);
    return req;
  });
};

AWS.clearAllMocks = () => {
  const services = Object.keys(clients).filter((key) => key !== 'get');
  services.forEach((service) => {
    delete clients[service];
    const split = service.split('.');
    const real = traverse(_AWS).get(split);
    traverse(AWS).set(split, real);
  });
};

module.exports = AWS;
