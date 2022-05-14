describe("example suite 1", () => {
  
  test('success', () => {
    expect(true).toBe(true);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('skip', () => {
    expect(true).toBe(false);
  });

  test('failure', () => {
    expect(true).toBe(false);
  });

});
