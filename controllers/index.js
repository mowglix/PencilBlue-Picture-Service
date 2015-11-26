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
    var url = require('url');

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

        var mime = pb.RequestHandler.getMimeFromPath(this.req.url);
        if (mime) {
            this.res.setHeader('content-type', mime);
        }

        var url_parts = url.parse(this.req.url, true);

        //load the media if available
        var mediaPath = "/media/" + url_parts.pathname.substring(URL_prefix.length);

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
                        var dimensions = getPicDimensions(metadata, url_parts.query);
                        var pipeline2 = sharp();

                        if (dimensions.cropHeight === undefined && dimensions.cropWidth === undefined)
                            pipeline2.resize(dimensions.width, dimensions.height).pipe(self.res);
                        else {
                            pipeline2.resize(dimensions.width, dimensions.height)
                            .extract(dimensions)
                            .pipe(self.res);                         
                        }
                        mstream2.pipe(pipeline2);
                    });                    
                }
            });
            mstream.pipe(pipeline);
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


