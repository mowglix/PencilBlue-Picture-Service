
/*
TODO: 
- write to cache
- set picture quality
- rename after writing
- error handling
        var pluginService = new pb.PluginService();
        pluginService.getSetting('Picture_Service_Cache_Path', 'PencilBlue-Picture-Service', function(err, settings) {
            console.log(settings);
        });

*/

module.exports = function PictureServiceModule(pb) {
  var util = pb.util;
  var uid = require('uid');
  var sharp = require('sharp');

  var getPicDimensions = function(metadata, demandedSize) {
      if(demandedSize.width === undefined && demandedSize.height === undefined) {
          return {width: metadata.width, height: metadata.height};
      } 
      else if (demandedSize.height === undefined) {
          demandedSize.width = parseInt(demandedSize.width);
          return {width: Math.round(demandedSize.width), height: Math.round(metadata.height * demandedSize.width/metadata.width)};
      }
      else if (demandedSize.width === undefined) {
          demandedSize.height = parseInt(demandedSize.height);
          return {width: Math.round(metadata.width * demandedSize.height/metadata.height), height: Math.round(demandedSize.height)}; 
      }
      else {
          // TODO, do 
          demandedSize.height = Math.round(parseInt(demandedSize.height));
          demandedSize.width  = Math.round(parseInt(demandedSize.width));
          var cropWidth = (metadata.width - demandedSize.width)/2;
          var cropHeight = (metadata.height - demandedSize.height)/2;
          cropHeight = cropHeight < 0 ? 0 : cropHeight;
          cropWidth = cropWidth < 0 ? 0 : cropWidth;
          return {width: metadata.width - 2*cropWidth,
              height: metadata.height - 2*cropHeight, 
              top: cropHeight,
              left: cropWidth
          };
      }
  };

  function PictureService(){}

  PictureService.init = function(cb){
    pb.log.debug("PictureService: Initialized");
    cb(null, true);
  };

  PictureService.getName = function(){
    return "PictureService";
  };

  PictureService.prototype.getPictureStream = function(mediaPath, expectedSize, cb){
    var self = this;

    var mservice  = new pb.MediaService();

    mservice.getContentStreamByPath(mediaPath, function(err, mstream) {
        if(util.isError(err)) {
            return self.reqHandler.serveError(err); 
        }

        mstream.once('error', function(err) {
          cb(err, null);
          return;
        });

        // TODO
        // https://github.com/lovell/sharp/issues/236 once implemented, should allow for something more elegant. Discussed in #314

        var pipeline = sharp();
        pipeline.metadata(function(err, metadata){
            if(metadata.format !== 'jpeg' &&
                metadata.format !== 'png' &&
                metadata.format !== 'webp' &&
                metadata.format !== 'gif') {
                self.reqHandler.serve404();
            }
            else {
                mservice.getContentStreamByPath(mediaPath, function(err2, mstream2) {
                    var dimensions = getPicDimensions(metadata, expectedSize);
                    var pipeline2 = sharp();

                    mstream2.once('error', function(err) {
                      cb(err, null);
                      return;
                    });

                    if (dimensions.cropHeight === undefined && dimensions.cropWidth === undefined)
                        cb(null, pipeline2.resize(dimensions.width, dimensions.height));
                    else {
                        cb(null, pipeline2.resize(dimensions.width, dimensions.height).extract(dimensions));
                    }
                    mstream2.pipe(pipeline2);
                });                    
            }
        });
        mstream.pipe(pipeline);
    });    
  };

  return PictureService;
};