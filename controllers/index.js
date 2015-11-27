
/*
TODO: 
- Take URL Prefix from settings
- enable/disable
- guard from resize attacks

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

        var mime = pb.RequestHandler.getMimeFromPath(this.req.url);
        if (mime) {
            this.res.setHeader('content-type', mime);
        }

        var url_parts = url.parse(this.req.url, true);

        var mediaPath = "/media/" + url_parts.pathname.substring(URL_prefix.length);

        var PictureService = pb.PluginService.getService('PictureService', 'PencilBlue-Picture-Service');
        var pictureService = new PictureService();

        pictureService.getPictureStream(mediaPath, url_parts.query, function(err, stream){
            if(err !== null)  {
                self.reqHandler.serveError(err);
                return;
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


