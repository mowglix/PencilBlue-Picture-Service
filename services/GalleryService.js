(function() {
	'use strict';

	var moment = require('moment');
	var async = require('async');
	var constants   = require('../lib/constants');

	module.exports = function(pb) {
		var util = pb.util;
		var ArticleServiceV2 = pb.ArticleServiceV2;
		var TopicService = pb.TopicService;
		var url_prefix   = constants.url_prefix;
	    var defaultTemplate = 'elements/article';

		// Initialize the service object
		function GalleryService(controller) {
			this.controller = controller;
			this.mediaService = new pb.MediaService();
		}

		// This function will be called when PencilBlue loads the service
		GalleryService.init = function(cb) {
			console.log("GalleryService: Initialized");
			cb(null, true);
		};

		GalleryService.prototype.render = function(content, cb) {
			var self = this;
			var context = this.controller.getServiceContext();
			var mediaArray = content.article_media || content.page_media;
			var ats = this.controller.ts.getChildInstance();

			var tasks = util.getTasks(mediaArray, function(mediaArray, i) {
				return function(callback) {
					self.mediaService.loadById(mediaArray[i], callback);
				};
			});
			async.series(tasks, function(err, mediaDescriptors) {
				var i = 0;
				var validMediaCounter = 0;
				for (; i < mediaDescriptors.length; i++) {
					if (mediaDescriptors[i].media_type === 'image' ||
						mediaDescriptors[i].media_type === 'youtube' ||
						mediaDescriptors[i].media_type === 'vimeo') {
						validMediaCounter++;
					}
				}

				if (validMediaCounter === 0) {
					cb(null, '');
				} else {
					var gts = ats.getChildInstance();
					gts.registerLocal('article_gallery_elements', function(flag, callback) {
						self.renderGalleryElements(mediaDescriptors, callback);
					});
					gts.load('galleryDemo/article/gallery', function(err, content) {
						cb(err, new pb.TemplateValue(content, false));
					});
				}
			});

		};

		GalleryService.prototype.renderGalleryElements = function(mediaDescriptors, cb) {
			var self = this;

			var tasks = util.getTasks(mediaDescriptors, function(mediaArray, i) {
				return function(callback) {
					self.renderGalleryElement(mediaArray[i], callback);
				};
			});
			async.series(tasks, function(err, content) {
				cb(err, new pb.TemplateValue(content.join(''), false));
			});
		};

		GalleryService.prototype.renderGalleryElement = function(descriptor, cb) {
			var self = this;

			var imagePath;
			var gts = self.controller.ts.getChildInstance();
			gts.registerLocal('article_gallery_elem_name', GalleryService.valOrEmpty(descriptor.name));
			gts.registerLocal('article_gallery_elem_caption', GalleryService.valOrEmpty(descriptor.caption));
			if (descriptor.media_type === 'image') {
				imagePath = url_prefix + descriptor.location.substring(7);
				gts.registerLocal('article_gallery_elem_url', imagePath);
				gts.load('galleryDemo/article/gallery_element', cb);
			} else if (descriptor.media_type === 'youtube') {
				imagePath = "https://youtube.com/watch?v=" + descriptor.location;
				gts.registerLocal('article_gallery_elem_url', imagePath);
				gts.load('galleryDemo/article/gallery_element_video', cb);
			} else if (descriptor.media_type === 'vimeo') {
				imagePath = "http://vimeo.com/" + descriptor.location;
				gts.registerLocal('article_gallery_elem_url', imagePath);
				gts.load('galleryDemo/article/gallery_element_video', cb);
			} else
				cb(null, '');
		};

	    GalleryService.valOrEmpty = function(val) {
	        return val ? val : '';
	    };

		return GalleryService;
	};

}());
