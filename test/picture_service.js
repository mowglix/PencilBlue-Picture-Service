

var assert = require('assert');
var rewire = require('rewire');
var pbMockup = null;
var PictureServiceModule, PictureService;

PictureServiceModule = rewire("..-..-services-picture_service.js")(pbMockup);
pictureService = new PictureServiceModule();
pictureService.init();


describe('Module check', function() {
  it('should have a name of "PictureService"', function () {
    assert.equal(pictureService.getName(), "PictureService");
  });
});

describe('Helpers', function() {
  describe('getPicDimensions', function () {
    var getPicDimensions = PictureServiceModule.__get__("getPicDimensions");
    var getCachePath = PictureServiceModule.__get__("getCachePath");

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

  describe('getCachePath', function () {
    it('should return correct pathname for no width and height', function () {
      var mediaPath = "-media-2014-11-dlfkasdjfdsdf.jpg";
      var expectedSize = {};
      var pathPrefix = "/tmp/";
      var cachePath = getCachePath(mediaPath, expectedSize, pathPrefix);

      assert.equal(cachePath, "/tmp/media-2014-11-dlfkasdjfdsdf.jpg");
    });
    it('should return correct pathname for width', function () {
      var mediaPath = "-media-2014-11-dlfkasdjfdsdf.jpg";
      var expectedSize = {widht: 123};
      var pathPrefix = "/tmp";
      var cachePath = getCachePath(mediaPath, expectedSize, pathPrefix);

      assert.equal(cachePath, "/tmp/media-2014-11-dlfkasdjfdsdf-w123.jpg");
    });
    it('should return correct pathname for height', function () {
      var mediaPath = "-media-2014-11-dlfkasdjfdsdf.jpg";
      var expectedSize = {height: 123};
      var pathPrefix = "/tmp/";
      var cachePath = getCachePath(mediaPath, expectedSize, pathPrefix);

      assert.equal(cachePath, "/tmp/media-2014-11-dlfkasdjfdsdf-h123.jpg");
    });
    it('should return correct pathname for widht and height', function () {
      var mediaPath = "-media-2014-11-dlfkasdjfdsdf.jpg";
      var expectedSize = {width: 123, height: 456};
      var pathPrefix = "/tmp";
      var cachePath = getCachePath(mediaPath, expectedSize, pathPrefix);

      assert.equal(cachePath, "/tmp/media-2014-11-dlfkasdjfdsdf-w123-h456.jpg");
    });
  });


});

