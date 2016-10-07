(function () {
	'use strict';

	var async = require('async');
	var moment = require('moment');

	module.exports = function(pb) {

		//PB dependencies
		var util = pb.util;
		var BaseController = pb.BaseController;
		var ArticleServiceV2 = pb.ArticleServiceV2;

		// Instantiate the controller & extend the base controller
		var articleGalleryDemoController = function (){};
		util.inherits(articleGalleryDemoController, pb.BaseController);

		articleGalleryDemoController.prototype.render = function(cb) {
			var self = this;

			var contentService = new pb.ContentService({site: self.site, onlyThisSite: true});
			var eventsService = new (pb.PluginService.getService('EventsService', 'drs-Courses'))(this);

			contentService.getSettings(function(err, contentSettings) {
				self.gatherData(function(err, data) {
					var output = {
							content_type: 'text/html',
							code: 200
					};

					self.ts.registerLocal('navigation', new pb.TemplateValue(data.nav.navigation, false));
					self.ts.registerLocal('articles', function(flag, cbTs) {
						self.renderTop10Articles(cbTs);
					});

					self.ts.load('articleGalleryDemo', function(error, result) {
							output.content = result;
							cb(output);
					});
				});
			});
		};

		articleGalleryDemoController.prototype.renderTop10Articles = function(callback) {
				var self  = this;
				var articleService = new ArticleServiceV2(this.site, true);

				var query = {
					order: { publish_date: 1 }
				};

				articleService.getAll(query, function (err, articleData) {
					var tasks = util.getTasks(articleData, function(content, i) {
						return function(taskCallback) {
							if(i>=10) {
								return taskCallback(null, '');
							}
							self.renderArticle(content[i], i, taskCallback);
						};
					});
					async.parallel(tasks, function(err, result) {
							callback(err, new pb.TemplateValue(result.join(''), false));
					});
				});
		};

		articleGalleryDemoController.prototype.renderArticle = function(content, index, cb) {
			var self = this;

			var ats = this.ts.getChildInstance();
			var context = this.getServiceContext();
			var publish_date = moment(content.publish_date).locale(context.ls.language);
			var galleryService = new (pb.PluginService.getService('GalleryService', 'PencilBlue-Picture-Service'))(this);

			ats.registerLocal('article_headline', new pb.TemplateValue('<a href="' + pb.UrlService.urlJoin('/article/', content.url) + '">' + content.headline + '</a>', false));
			ats.registerLocal('article_headline_nolink', content.headline);
			ats.registerLocal('article_subheading', content.subheading ? content.subheading : '');
			ats.registerLocal('article_subheading_display', content.subheading ? '' : 'display:none;');
			ats.registerLocal('article_id', content[pb.DAO.getIdField()].toString());
			ats.registerLocal('article_index', index);
			ats.registerLocal('article_timestamp', publish_date.format('D. MMMM YYYY'));
			ats.registerLocal('article_timestampShort', publish_date.format('DD.MM.YYYY'));
			ats.registerLocal('article_layout', new pb.TemplateValue(content.layout, false));
			ats.registerLocal('article_url', content.url);
			ats.registerLocal('article_gallery', function (flag, callback) {
				galleryService.render(content, callback);
			});

			ats.load('galleryDemo/article', cb);
		};

		articleGalleryDemoController.prototype.gatherData = function(cb) {
				var self  = this;
				var tasks = {
						nav: function(callback) {
								self.getNavigation(function(themeSettings, navigation, accountButtons) {
										callback(null, {themeSettings: themeSettings, navigation: navigation, accountButtons: accountButtons});
								});
						}
				};
				async.parallel(tasks, cb);
		};

		articleGalleryDemoController.prototype.getNavigation = function(cb) {
				var options = {
						currUrl: this.req.url,
						site: this.site,
						session: this.session,
						ls: this.ls,
						activeTheme: this.activeTheme
				};

				var menuService = new pb.TopMenuService();
				menuService.getNavItems(options, function(err, navItems) {
						if (util.isError(err)) {
								pb.log.error('Index: %s', err.stack);
						}
						cb(navItems.themeSettings, navItems.navigation, navItems.accountButtons);
				});
		};


		articleGalleryDemoController.getRoutes = function(cb) {
			var pluginService = new pb.PluginService();
			var routes = [];
			var galleryDemoRoute;

			galleryDemoRoute = {
					method: 'get',
					path: '/galleryDemo',
					handler: 'render',
					auth_required: false,
					content_type: 'text/html',
					localization: true
			};

			pluginService.getSettingsKV ('PencilBlue-Picture-Service', function(err, settings) {
					var gallery_enabled;
					if(err) {
							pb.log.error("getSettingsKV failed: " + err.description);
					}
					else {
							gallery_enabled = settings.Article_Demo_Route_Enabled.toLowerCase().trim() === 'true';
							if (gallery_enabled) {
								routes.push(galleryDemoRoute);
							}
					}
					cb(null, routes);
			});

		};

		return articleGalleryDemoController;
	};

}());