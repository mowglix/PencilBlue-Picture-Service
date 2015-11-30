/*
TODO: 
- Don't use ? for caching reasons

- hand in gallery change

- guard from resize attacks

- Readme

- fix the date form of article entries
- allow for videos
- improve video upload
*/

module.exports = function PictureStreamModule(pb) {
    
    //pb dependencies
    var util = pb.util;
    var url = require('url');
    var constants = require('../lib/constants');

    // Constants
    var URL_prefix   = constants.url_prefix;
 
    var PictureStream = function () {};
    util.inherits(PictureStream, pb.BaseController);

    PictureStream.prototype.render = function(cb) {
        var self      = this;
       
        var url_parts = url.parse(this.req.url, true);

        var mediaPath = "/media/" + url_parts.pathname.substring(URL_prefix.length);

        var PictureService = pb.PluginService.getService('PictureService', 'PencilBlue-Picture-Service');
        var pictureService = new PictureService();

        var pluginService  = new pb.PluginService();
        pluginService.getSettingsKV ('PencilBlue-Picture-Service', function(err, settings) {
            if(err) {
                cb(err);
                pb.log.error("getSettingsKV failed: " + err.description);
                return;
            }

            var isThumb = url_parts.query.quality !== undefined && url_parts.query.quality.toLowerCase().trim() === 'thumb';
            var quality_regular = parseInt(settings.Quality_Regular);
            var quality_thumb   = parseInt(settings.Quality_Thumbnail);
            quality_thumb   = (isNaN(quality_thumb)   ? undefined : Math.round(quality_thumb));
            quality_regular = (isNaN(quality_regular) ? undefined : Math.round(qupictureServiceality_regular));

            //remove potential harmfull user-input
            var expectedSize = {
                width: url_parts.query.width,
                height: url_parts.query.height,
                maxWidth: settings.Max_Width,
                maxHeight: settings.Max_Height 
            };

            if (isThumb && quality_thumb !== undefined) {
                expectedSize.quality = quality_thumb;
            }
            else if (!isThumb && quality_regular !== undefined) {
                expectedSize.quality = quality_regular;                
            }


            pictureService.getPictureStream(mediaPath, expectedSize, function(err, stream, info){
                if(err !== null)  {
                    pb.log.error("getPictureStream failed: " + err.description);
                    self.reqHandler.serveError(err);
                    return;
                }
                stream.once('error', function(err) {
                    pb.log.error("Picturestream failed: " + err.description);
                });
                if (info.mimeType) {
                    self.res.setHeader('Content-Type', info.mimeType);
                }
                if (info.streamLength) {
                    self.res.setHeader('Content-Length', info.streamLength);
                }
          
                stream.pipe(self.res);
            });

        });
    };

    PictureStream.getRoutes = function(cb) {
        var routes = [{
                method: 'get',
                path: URL_prefix + '*',
                auth_required: false
            }];
        cb(null, routes);
    };

    //exports
    return PictureStream;
};
