import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBirthDate } from '../src/utils/birthDate';

test('birth dates remain valid date input values through database JSON and profile saves', () => {
  for (const input of ['1981-12-29', '1981-12-29T00:00:00.000Z', new Date('1981-12-29T00:00:00Z')]) {
    const dob = normalizeBirthDate(input);
    assert.equal(dob, '1981-12-29');
    assert.equal(normalizeBirthDate(JSON.parse(JSON.stringify({ dob })).dob), dob);
  }
  assert.equal(normalizeBirthDate('2000-02-29T00:00:00+03:00'), '2000-02-29');
  for (const input of [null, undefined, '', '2025-02-29', '1981-13-29', new Date(NaN)]) {
    assert.equal(normalizeBirthDate(input), '');
  }
});
