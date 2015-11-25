/*
    Copyright (C) 2015  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

module.exports = function PictureServiceModule(pb) {
    
    //pb dependencies
    var util = pb.util;
    var sharp = require('sharp');

    /* Constants */
    var URL_prefix = "/images/";

    /**
     * Media Content Controller is responsible for taking incoming requests for media and 
     * providing the right content for it or redirecting to where it should be.
     * @class PictureService
     * @constructor
     * @extends BaseController
     */
    var PictureService = function () {};
    util.inherits(PictureService, pb.BaseController);

    /**
     * 
     *
     */
    PictureService.prototype.render = function(cb) {
        var self      = this;

        var mime = pb.RequestHandler.getMimeFromPath(this.req.url);
        if (mime) {
            this.res.setHeader('content-type', mime);
        }

        //load the media if available
        var mediaPath = "/media/" + this.req.url.substring(URL_prefix.length);
        var mservice  = new pb.MediaService();
        mservice.getContentStreamByPath(mediaPath, function(err, mstream) {
            if(util.isError(err)) {
                return self.reqHandler.serveError(err); 
            }

            mstream.once('end', function() {
                //do nothing. content was streamed out and closed
            })
            .once('error', function(err) {
                if (err.message.indexOf('ENOENT') === 0) {
                    self.reqHandler.serve404();
                }
                else {
                    pb.log.error('Failed to load media: MIME=%s PATH=%s', mime, mediaPath);
                    self.reqHandler.serveError(err);
                }
            });
            var pipeline = sharp();
            pipeline.metadata(function(metadata){
                console.log(metadata);
                pipeline.resize(400, 300).pipe(self.res);
            });
            mstream.pipe(pipeline);

//            var pipeline = sharp();
//            pipeline.metadata(function(metadata){
//                console.log(metadata);
//            }).resize(400, 300).pipe(self.res);
//            mstream.pipe(pipeline);


        });
    };

    PictureService.getRoutes = function(cb) {
        var routes = [{
                method: 'get',
                path: URL_prefix + '*',
                auth_required: false
            }];
        cb(null, routes);
    };

    //exports
    return PictureService;
};


