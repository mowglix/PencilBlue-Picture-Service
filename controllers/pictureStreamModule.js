/*
TODO: 

- change /images/ to something else

- Readme

- hand in gallery change

- allow deactivating this route
- define what article template to use
- avoid empty gallery tag if no media
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

    var sanitizeExpectedSize = function(width, validWidthList) {
        var validWidth = validWidthList.split(",");
        var i=0;
        var valid = false;

        for (; i < validWidth.length; i++) {
            if (validWidth[i].trim() == width)
                valid = true;
        }

        if (valid)
            return width;
        else
            return undefined;
    };

    var getRequestParameters = function (url_parts) {
        var mediaPath = "";
        var origPathName = "";
        var query = {};
        var queryElements, key, value;
        var i=1; // not because first element is @PAR

        // Patten ends with: /@PAR_Q20_W300
        url_parts.pathname = (url_parts.pathname.slice(-1) === '/' ? url_parts.pathname.substring(0,url_parts.pathname.length-1) : url_parts.pathname );
        var pathElements = url_parts.pathname.split("/");

        if(pathElements[pathElements.length-1].substring(0,5) === '@PAR_') {
            queryElements = pathElements[pathElements.length-1].split("_");

            for(; i < queryElements.length; i++) {
                key = queryqueryElements[i].substring(0,1).toLowerCase();
                value = queryqueryElements[i].substring(1);
                query[key] = value;
            }
        }
        else {
            origPathName = url_parts.pathname;
        }

        mediaPath = "/media/" + origPathName.substring(URL_prefix.length);

        return {mediaPath: mediaPath, query: query};
    };

 
    var PictureStream = function () {};
    util.inherits(PictureStream, pb.BaseController);

    PictureStream.prototype.render = function(cb) {
        var self      = this;
       
        var url_parts = url.parse(this.req.url, true);

        var requestParameters = getRequestParameters(url_parts);

        var PictureService = pb.PluginService.getService('PictureService', 'PencilBlue-Picture-Service');
        var pictureService = new PictureService();

        var pluginService  = new pb.PluginService();
        pluginService.getSettingsKV ('PencilBlue-Picture-Service', function(err, settings) {
            if(err) {
                cb(err);
                pb.log.error("getSettingsKV failed: " + err.description);
                return;
            }

            var isThumb = requestParameters.query.q !== undefined && requestParameters.query.q.toLowerCase().trim() === 'thumb';
            var quality_regular = parseInt(settings.Quality_Regular);
            var quality_thumb   = parseInt(settings.Quality_Thumbnail);
            quality_thumb   = (isNaN(quality_thumb)   ? undefined : Math.round(quality_thumb));
            quality_regular = (isNaN(quality_regular) ? undefined : Math.round(qupictureServiceality_regular));

            //remove potential harmfull user-input
            var expectedSize = {
                width: requestParameters.query.w,
                height: requestParameters.query.h,
                maxWidth: settings.Max_Width,
                maxHeight: settings.Max_Height 
            };

            //check that width/height is allowed to prevent from
            //attacks trying to fill the cache with pics
            
            expectedSize.width  = sanitizeExpectedSize(expectedSize.width,settings.Valid_Width_List);
            expectedSize.height = sanitizeExpectedSize(expectedSize.height,settings.Valid_Hight_List);

            if (isThumb && quality_thumb !== undefined) {
                expectedSize.quality = quality_thumb;
            }
            else if (!isThumb && quality_regular !== undefined) {
                expectedSize.quality = quality_regular;                
            }


            pictureService.getPictureStream(requestParameters.mediaPath, expectedSize, function(err, stream, info){
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
