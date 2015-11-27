
/*
TODO: 
- testing
- restructure external interface
- set picture quality
- allow disabling caching
- error handling
- add error logging

https://github.com/jhnns/rewire
http://stackoverflow.com/questions/14874208/how-to-access-and-test-an-internal-non-exports-function-in-a-node-js-module
http://howtonode.org/testing-private-state-and-mocking-deps

*/

module.exports = function PictureServiceModule(pb) {
  var uid = require('uid');
  var sharp = require('sharp');
  var fs = require('fs');

  var getPictureFromStorage = function(mediaPath, expectedSize, cachePath, settings, cb) {
    var mservice  = new pb.MediaService();
    var tempPath = settings.Picture_Service_Cache_Path + '/' + uid(20);
    var wstream = fs.createWriteStream(tempPath, {encoding: 'binary'});
    wstream.on('end', function() {
      //renaming at the end for avoiding that two processes write simoultanously to the same file.
      fs.rename(tempPath, cachePath, function(err) {
        if (err)
          pb.log.warn("Rewrite tempFile failed, descpription: " + err.description);
      });
    });

    mservice.getContentStreamByPath(mediaPath, function(err, mstream) {
      if(err) {
        cb(err, null);
        return;
      }

      // TODO
      // https://github.com/lovell/sharp/issues/236 once implemented, should allow for something more elegant. Discussed in #314
      var pipeline = sharp();
      pipeline.metadata(function(err, metadata){
          if(err) {
            pb.log.error("Second metadata failed: " + err.description);
            cb(new Error(null, "Fetching Metadata failed"), null);
            return;
          }        
          if(metadata.format !== 'jpeg' &&
              metadata.format !== 'png' &&
              metadata.format !== 'webp' &&
              metadata.format !== 'gif') {
              cb(new Error(null, "file type not supported"), null);
              return; 
          }
          mservice.getContentStreamByPath(mediaPath, function(err, mstream2) {
              var dimensions = getPicDimensions(metadata, expectedSize);
              var pipeline2 = sharp();
              var pipelineFs;
              var pipelineCb;

              if(err) {
                cb(err, null);
                pb.log.error("Second mediastream failed: " + err.description);
                return;
              }        

              if (dimensions.cropHeight === undefined && dimensions.cropWidth === undefined) {
                  pipeline2.resize(dimensions.width, dimensions.height);
              }
              else {
                  pipeline2.resize(dimensions.width, dimensions.height).extract(dimensions);
              }
              pipelineFs = pipeline2.clone();
              pipelineCb = pipeline2.clone();
              cb(null, pipelineCb);
              pipelineFs.pipe(wstream);

              mstream2.pipe(pipeline2);
          });                    
        });
        mstream.pipe(pipeline);
    });  
  };

  var getPictureFromCache = function(cachePath, cb) {
    var rstream = fs.createReadStream(cachePath, {encoding: 'binary'});
    cb(null, rstream);
  };


/* ****************************************************************
 * Helpers
 * **************************************************************** */
  var getCachePath = function(mediaPath, expectedSize, pathPrefix) {
    var mediaPathOut = pathPrefix + '/';
    mediaPathOut += mediaPath.replace('/', '-');
    if(expectedSize.width !== undefined) {
        mediaPathOut += '-w'+ Math.round(expectedSize.width);
    }
    if(expectedSize.height !== undefined) {
        mediaPathOut += '-h'+ Math.round(expectedSize.height);
    }
    return mediaPathOut;
  };

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

/* ****************************************************************
 * External interface
 * **************************************************************** */
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
    var cachePath, pluginService;

    pluginService = new pb.PluginService();
    pluginService.getSettingsKV ('PencilBlue-Picture-Service', function(err, settings) {
      if(err) {
        cb(err, null);
        return;
      }

      cachePath = getCachePath(mediaPath, expectedSize, settings.Picture_Service_Cache_Path);
      fs.access(cachePath, fs.R_OK, function (err) {
        if (err)
          getPictureFromStorage(mediaPath, expectedSize, cachePath, settings, cb);
        else
          getPictureFromCache(cachePath, cb);
      });
    });
  };

  return PictureService;
};