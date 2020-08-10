const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const Arrays256Impl = artifacts.require('Arrays256Impl');

contract('Arrays256Impl', async (accounts) => {
  const ELEMENTS_ARRAY = [28, 12, 7, 20, 15, 1];

  let Arrays256ImplInstance;

  beforeEach(async function () {
    Arrays256ImplInstance = await Arrays256Impl.new(ELEMENTS_ARRAY);
  });

  describe('Arrays', function () {
    it('Heap Sort has correct ordered array', async () => {
      await Arrays256ImplInstance.heapSort();

      const arrayValues = await Arrays256ImplInstance.getArray();

      expect(arrayValues.map(v => v.toNumber())).to.have.ordered.members(
        [1, 7, 12, 15, 20, 28]
      );
    });
  });
});
