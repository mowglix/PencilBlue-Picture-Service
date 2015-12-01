
//dependencies
var async       = require('async');
var HtmlEncoder = require('htmlencode');
var Moment      = require('moment');
var constants   = require('./constants');

//
module.exports = function(pb) {
    
    //pb dependencies
    var DAO          = pb.DAO;
    var Localization = pb.Localization;
    var ClientJs     = pb.ClientJs;
    var util         = pb.util;
    var url_prefix   = constants.url_prefix;
    var defaultTemplate = 'elements/article';

    var DISPLAY_NONE_STYLE_ATTR = 'display:none;';

    function ContentViewLoader(context, template) {
        this.mediaService =  new pb.MediaService();
        this.template = (template === undefined ? defaultTemplate : template);
        this.context = context;
        ContentViewLoader.super_.call(this, context);
    }
    util.inherits(ContentViewLoader, pb.ContentViewLoader);

    ContentViewLoader.prototype.renderContent = function(content, options, cb) {
        var self = this;
        var timestamp = new Moment(content.timestamp);
        timestamp.locale(this.context.ls.language);

        //set recurring params
        if (util.isNullOrUndefined(options.contentIndex)) {
            options.contentIndex = 0;
        }

        var isPage           = this.service.getType() === 'page';
        var showByLine       = this.contentSettings.display_bylines && !isPage;
        var showTimestamp    = this.contentSettings.display_timestamp && !isPage;
        var ats              = self.ts.getChildInstance();
        var contentUrlPrefix = '/' + this.service.getType() + '/';
        self.ts.reprocess = false;
        ats.registerLocal('article_permalink', function(flag, cb) {
            self.onContentPermalink(content, options, cb);
        });
        ats.registerLocal('article_headline', function(flag, cb) {
            self.onContentHeadline(content, options, cb);
        });
        ats.registerLocal('article_headline_nolink', content.headline);
        ats.registerLocal('article_subheading', ContentViewLoader.valOrEmpty(content.subheading));
        ats.registerLocal('article_subheading_display', ContentViewLoader.getDisplayAttr(content.subheading));
        ats.registerLocal('article_id', content[pb.DAO.getIdField()] + '');
        ats.registerLocal('article_index', options.contentIndex);
        ats.registerLocal('article_timestamp', showTimestamp && content.timestamp ? content.timestamp : '');
        ats.registerLocal('article_timestamp_display', ContentViewLoader.getDisplayAttr(showTimestamp));
        ats.registerLocal('article_timestamp_L',    timestamp.format('L'));    // 2015-11-30
        ats.registerLocal('article_timestamp_l',    timestamp.format('l'));    // 2015-11-30
        ats.registerLocal('article_timestamp_LL',   timestamp.format('LL'));   // 30 November, 2015
        ats.registerLocal('article_timestamp_ll',   timestamp.format('ll'));   // 30 Nov, 2015
        ats.registerLocal('article_timestamp_LLL',  timestamp.format('LLL'));  // 30 November, 2015 10:57 PM
        ats.registerLocal('article_timestamp_lll',  timestamp.format('lll'));  // 30 Nov, 2015 10:57 PM
        ats.registerLocal('article_timestamp_LLLL', timestamp.format('LLLL')); // Monday, 30 November, 2015 10:57 PM
        ats.registerLocal('article_timestamp_llll', timestamp.format('llll')); // Mon, 30 Nov, 2015 10:57 PM        
        ats.registerLocal('article_timestamp_LT',   timestamp.format('LT'));   // 8:30 PM
        ats.registerLocal('article_timestamp_LTS',  timestamp.format('LTS'));  // 8:30:25 PM
        ats.registerLocal('article_layout', new pb.TemplateValue(content.layout, false));
        ats.registerLocal('article_url', content.url);
        ats.registerLocal('article_gallery_elements', function(flag, cb) {
            var i = 1;
            self.renderGalleryElements(content, options, cb);
        });
        ats.registerLocal('display_byline', ContentViewLoader.getDisplayAttr(showByLine));
        ats.registerLocal('author_photo', ContentViewLoader.valOrEmpty(content.author_photo));
        ats.registerLocal('author_photo_display', ContentViewLoader.getDisplayAttr(content.author_photo));
        ats.registerLocal('author_name', ContentViewLoader.valOrEmpty(content.author_name));
        ats.registerLocal('author_position', ContentViewLoader.valOrEmpty(content.author_position));
        ats.registerLocal('media_body_style', ContentViewLoader.valOrEmpty(content.media_body_style));
        ats.registerLocal('comments', function(flag, cb) {
            if (isPage || !pb.ArticleService.allowComments(self.contentSettings, content)) {
                return cb(null, '');
            }

            var ts = ats.getChildInstance();
            self.renderComments(content, ts, function(err, comments) {
                cb(err, new pb.TemplateValue(comments, false));
            });
        });
        ats.load(self.template, cb);
        
        options.contentIndex++;
    };


    ContentViewLoader.prototype.renderGalleryElements = function(content, options, cb) {
        var self  = this;

        var tasks = util.getTasks(content.article_media, function(mediaArray, i) {
            return function(callback) {
                self.renderGalleryElement(mediaArray[i], options, callback);
            };
        });
        async.series(tasks, function(err, content) {
            cb(err, new pb.TemplateValue(content.join(''), false));
        });
    };

    ContentViewLoader.prototype.renderGalleryElement = function(mediaId, options, cb) {
        var self = this;

        //TODO get url-prefix from service

        self.mediaService.loadById(mediaId, function(err, descriptor) {
            var imagePath = url_prefix  + descriptor.location.substring(7);
            var gts = self.ts.getChildInstance();
            if(descriptor.media_type === 'image') {
                gts.registerLocal('article_gallery_elem_url', imagePath);
                gts.registerLocal('article_gallery_elem_name', ContentViewLoader.valOrEmpty(descriptor.name));
                gts.registerLocal('article_gallery_elem_caption', ContentViewLoader.valOrEmpty(descriptor.caption));
                gts.load('elements/article/gallery_element', cb);
            }
            else 
                cb(null, '', false);
        });
    };


    ContentViewLoader.valOrEmpty = function(val) {
        return val ? val : '';
    };

    ContentViewLoader.getDisplayAttr = function(val) {
        return val ? '' : DISPLAY_NONE_STYLE_ATTR;
    };

    return ContentViewLoader;
};