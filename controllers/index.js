
/*
TODO: 
- set mime type
- enable/disable
- guard from resize attacks
- add picture gallery
- allow disabling caching
- setup temp drive to system default
  https://nodejs.org/api/os.html#os_os_tmpdir
- make replacement of ContentViewLoader optional
- use URL_prefix from here in content_view_loader
- hand in gallery change
- allow to chose if normal size pic comes from orignal or having a max size
- allow for videos
*/

module.exports = function PictureStreamModule(pb) {
    
    //pb dependencies
    var util = pb.util;
    var url = require('url');

    // Constants
    var URL_prefix = "/images/";
 
    var PictureStream = function () {};
    util.inherits(PictureStream, pb.BaseController);

    PictureStream.prototype.render = function(cb) {
        var self      = this;
       
        var url_parts = url.parse(this.req.url, true);

        var mediaPath = "/media/" + url_parts.pathname.substring(URL_prefix.length);

        var PictureService = pb.PluginService.getService('PictureService', 'PencilBlue-Picture-Service');
        var pictureService = new PictureService();

        //remove potential harmfull user-input
        var expectedSize = {
            width: url_parts.query.width,
            height: url_parts.query.height
        };

        pictureService.getPictureStream(mediaPath, expectedSize, function(err, stream, info){
            if(err !== null)  {
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


