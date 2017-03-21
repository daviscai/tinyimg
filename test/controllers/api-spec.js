import path from 'path';
import test from 'ava';
import supertest from 'supertest';

const appDir = path.resolve(__dirname, '../../');

const app = require(appDir + '/app/index');

const req = supertest(app.listen());

function get(urlSuffix) {
  return req.get(urlSuffix);
}

test('home index', async() => {
  await get('/').expect(200);
});
