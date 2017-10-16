'use strict';

const express = require('express');

let mockWriter;
const mockPlugin = jest.fn();
const mockTransform = jest.fn();

jest.mock('asset-pipe-js-writer', () => {
    const { Readable } = require('stream');
    mockWriter = jest.fn(() => ({
        plugin: mockPlugin,
        transform: mockTransform,
        bundle: () => {
            const items = [{}, {}, {}, {}];
            return new Readable({
                objectMode: true,
                read() {
                    if (!items.length) {
                        return this.push(null);
                    }
                    this.push(items.shift());
                },
            });
        },
    }));
    return mockWriter;
});

jest.mock('asset-pipe-css-writer', () => {
    const { Readable } = require('stream');
    const items = [{}, {}, {}, {}];
    const cssWriter = new Readable({
        objectMode: true,
        read() {
            if (!items.length) {
                return this.push(null);
            }
            this.push(items.shift());
        },
    });
    return jest.fn(() => cssWriter);
});

const Client = require('../../');

function createTestServer(handlers) {
    const server = express();
    for (const handler of handlers) {
        server[handler.verb](handler.path, handler.cb);
    }
    return new Promise(resolve => {
        const serve = server.listen(() => {
            resolve({
                server: serve,
                port: serve.address().port,
            });
        });
    });
}

test('uploadFeed(files, options) - js', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.send('Success!'),
        },
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toBe('Success!');
    server.close();
});

test('uploadFeed(files, options) - js - uses transforms', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.send('Success!'),
        },
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const fakeTransform = { _id: 1 };
    const fakeTransformOptions = { _id: 2 };
    client.transform(fakeTransform, fakeTransformOptions);

    await client.uploadFeed(fakeFiles, fakeOptions);

    expect(mockTransform.mock.calls[0]).toEqual([
        fakeTransform,
        fakeTransformOptions,
    ]);
    server.close();
});

test('uploadFeed(files, options) - js - uses plugins', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.send('Success!'),
        },
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const fakePlugin = { _id: 1 };
    const fakePluginOptions = { _id: 2 };
    client.plugin(fakePlugin, fakePluginOptions);

    await client.uploadFeed(fakeFiles, fakeOptions);

    expect(mockPlugin.mock.calls[0]).toEqual([fakePlugin, fakePluginOptions]);
    server.close();
});

test('uploadFeed(files) - 200', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(200).send('Bad request!'),
        },
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toBe('Bad request!');
    server.close();
});

test('uploadFeed(files) - 400', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(400).send({ message: 'Bad request!' }),
        },
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toEqual(new Error('Bad request!'));
    server.close();
});

test('uploadFeed(files) - other status codes', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(300).send('Bad request!'),
        },
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toEqual(
        new Error(
            'Asset build server responded with unknown error. Http status 300'
        )
    );
    server.close();
});

test('uploadFeed(files) - css', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(200).send('ok'),
        },
    ]);
    const fakeFiles = ['first.css', 'second.css', 'third.css'];
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles);

    await expect(result).resolves.toBe('ok');
    server.close();
});

test('createRemoteBundle(sources) - 200', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.send('success!'),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).resolves.toBe('success!');
    server.close();
});

test('createRemoteBundle(sources) - 202', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.status(202).send('success 202'),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).resolves.toBe('success 202');
    server.close();
});

test('createRemoteBundle(sources) - 400', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.status(400).send({ message: 'Bad request' }),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).rejects.toEqual(new Error('Bad request'));
    server.close();
});

test('createRemoteBundle(sources) - other status codes', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.status(204).send(),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).rejects.toEqual(
        new Error(
            'Asset build server responded with unknown error. Http status 204'
        )
    );
    server.close();
});
