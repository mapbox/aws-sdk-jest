'use strict';

const AWS = jest.genMockFromModule('aws-sdk');
const _AWS = jest.requireActual('aws-sdk');

Object.keys(_AWS).forEach((service) => {
  AWS[service] = _AWS[service];
});

const clients = {};

clients.get = (service) => {
  if (!clients[service]) clients[service] = new _AWS[service]();
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

AWS.clearAllMocks = () => {
  const services = Object.keys(clients).filter((key) => key !== 'get');
  services.forEach((service) => {
    delete clients[service];
    AWS[service] = _AWS[service];
  });
};

module.exports = AWS;
