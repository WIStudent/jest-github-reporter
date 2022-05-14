describe("example suite 2", () => {
  
  test('this test should succeed', () => {
    expect(true).toBe(true);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('this test should be skipped', () => {
    expect(true).toBe(false);
  });

  test('this test should fail', () => {
    expect(true).toBe(false);
  });


  describe("nested test suite", () => {
    test('this test should also fail', () => {
      expect(true).toBe(false);
    });
  });
});
