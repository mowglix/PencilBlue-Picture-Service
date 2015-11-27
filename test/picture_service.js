

var assert = require('assert');
var rewire = require('rewire');
var pbMockup = null;
var PictureServiceModule, PictureService;

PictureServiceModule = rewire("../../services/picture_service.js")(pbMockup);
pictureService = new PictureServiceModule();
pictureService.init();


describe('Module check', function() {
  it('should have a name of "PictureService"', function () {
    assert.equal(pictureService.getName(), "PictureService");
  });
});

describe('Helpers', function() {
  describe('getPicDimensions', function () {
    var getPicDimensions = myModule.__get__("getPicDimensions");

    it('should resize by height correctly', function () {
      var metadata = {width: 800, height: 600};
      var demandedSize = {width: 600};
      var newDimensions = getPicDimensions(metadata, demandedSize);
      assert.equal(newDimensions.height, 450);
      assert.equal(newDimensions.width, 600);
    });

    it('should resize by width correctly', function () {
      var metadata = {width: 800, height: 600};
      var demandedSize = {height: 240};
      var newDimensions = getPicDimensions(metadata, demandedSize);
      assert.equal(newDimensions.width, 320);
      assert.equal(newDimensions.height, 240);
    });

    it('should resize by width and height correctly', function () {
      var metadata = {width: 800, height: 600};
      var demandedSize = {height: 300, width: 300};
      var newDimensions = getPicDimensions(metadata, demandedSize);
      assert.equal(newDimensions.width, 300);
      assert.equal(newDimensions.height, 300);
      assert.equal(newDimensions.cropHeight, 0);
      assert.equal(newDimensions.cropWidth, 50);
    });

  });
});

