'use strict';

const AWS = jest.genMockFromModule('aws-sdk');
const _AWS = jest.requireActual('aws-sdk');

Object.keys(_AWS).forEach((service) => {
  AWS[service] = _AWS[service];
});

const clients = {};

clients.get = (service) => {
  if (!clients[service]) clients[service] = new _AWS[service]({});
  const client = clients[service];

  if (!jest.isMockFunction(AWS[service]))
    AWS[service] = jest.fn().mockImplementation(() => client);

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
    const req = new _AWS.Request(client, method, params);
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
    const req = new _AWS.Request(client, method, params);
    req.eachPage = jest.fn().mockImplementation(sendPage);
    return req;
  });
};

AWS.clearAllMocks = () => {
  const services = Object.keys(clients).filter((key) => key !== 'get');
  services.forEach((service) => {
    delete clients[service];
    AWS[service] = _AWS[service];
  });
};

module.exports = AWS;
